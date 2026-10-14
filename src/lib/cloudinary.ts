import { v2 as cloudinary } from 'cloudinary';
import { getTursoClient } from './turso';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Parse cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
export function parseCloudinaryUrl(urlStr: string): CloudinaryConfig | null {
  try {
    if (!urlStr) return null;
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('cloudinary://')) return null;
    const cleanUrl = trimmed.replace('cloudinary://', '');
    const [authPart, cloudName] = cleanUrl.split('@');
    if (!authPart || !cloudName) return null;
    const [apiKey, apiSecret] = authPart.split(':');
    if (!apiKey || !apiSecret) return null;
    return {
      cloudName: cloudName.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Get active Cloudinary configuration from environment or Turso app_settings
 */
export async function getCloudinaryConfig(): Promise<CloudinaryConfig | null> {
  // 1. Check direct CLOUDINARY_URL in env
  if (process.env.CLOUDINARY_URL) {
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (parsed) {
      cloudinary.config({
        cloud_name: parsed.cloudName,
        api_key: parsed.apiKey,
        api_secret: parsed.apiSecret,
        secure: true,
      });
      return parsed;
    }
  }

  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  let apiKey = process.env.CLOUDINARY_API_KEY || '';
  let apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  // 2. Check Turso app_settings table
  try {
    const client = getTursoClient();
    const res = await client.execute('SELECT key, value FROM app_settings');
    for (const row of res.rows) {
      const val = row.value ? String(row.value).trim() : '';
      if (row.key === 'cloudinary_url' && val.startsWith('cloudinary://')) {
        const parsed = parseCloudinaryUrl(val);
        if (parsed) {
          cloudName = parsed.cloudName;
          apiKey = parsed.apiKey;
          apiSecret = parsed.apiSecret;
          break;
        }
      }
      if (row.key === 'cloudinary_cloud_name' && val) {
        cloudName = val;
      }
      if (row.key === 'cloudinary_api_key' && val) {
        apiKey = val;
      }
      if ((row.key === 'cloudinary_token' || row.key === 'cloudinary_api_secret') && val) {
        apiSecret = val;
      }
    }
  } catch (err) {
    console.warn('Could not read app_settings for Cloudinary config:', err);
  }

  // Fallback to hardcoded secret if set in previous commit
  if (!apiSecret && process.env.CLOUDINARY_API_SECRET) {
    apiSecret = process.env.CLOUDINARY_API_SECRET;
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return { cloudName, apiKey, apiSecret };
  }

  return null;
}

/**
 * Ping Cloudinary to verify credentials
 */
export async function testCloudinaryConnection(customConfig?: Partial<CloudinaryConfig>): Promise<{ success: boolean; message: string; cloudName?: string }> {
  try {
    let cloudName = customConfig?.cloudName;
    let apiKey = customConfig?.apiKey;
    let apiSecret = customConfig?.apiSecret;

    if (!cloudName || !apiKey || !apiSecret) {
      const active = await getCloudinaryConfig();
      if (!active) {
        return {
          success: false,
          message: 'Chưa cấu hình đầy đủ Cloud Name, API Key hoặc API Secret.',
        };
      }
      cloudName = active.cloudName;
      apiKey = active.apiKey;
      apiSecret = active.apiSecret;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const res = await cloudinary.api.ping();
    if (res && res.status === 'ok') {
      return {
        success: true,
        message: `Kết nối Cloudinary thành công với Cloud: "${cloudName}"`,
        cloudName,
      };
    }
    return {
      success: false,
      message: 'Cloudinary không phản hồi trạng thái OK.',
    };
  } catch (error: any) {
    console.error('Cloudinary ping error:', error);
    return {
      success: false,
      message: error?.message || 'Không thể kết nối đến Cloudinary. Vui lòng kiểm tra lại thông tin cấu hình.',
    };
  }
}

/**
 * Upload image buffer directly to Cloudinary.
 * NEVER returns base64 or saves base64 to database.
 */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ url: string; publicId: string; provider: 'cloudinary' }> {
  const config = await getCloudinaryConfig();

  if (!config) {
    throw new Error(
      'Cloudinary chưa được cấu hình (thiếu Cloud Name, API Key hoặc API Secret). Vui lòng vào Cài đặt để thiết lập Cloudinary trước khi tải ảnh lên.'
    );
  }

  // Upload buffer to Cloudinary using upload_stream
  return new Promise((resolve, reject) => {
    const cleanName = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'wm_products',
        resource_type: 'image',
        public_id: `prod_${Date.now()}_${cleanName}`,
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          console.error('Cloudinary upload stream error:', error);
          return reject(
            new Error(
              error?.message || 'Lỗi khi tải ảnh lên Cloudinary. Vui lòng kiểm tra lại cấu hình hoặc kết nối mạng.'
            )
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete image from Cloudinary
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  if (!publicId || publicId.startsWith('local_')) return false;
  try {
    const config = await getCloudinaryConfig();
    if (!config) return false;
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}
