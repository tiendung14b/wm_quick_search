import { v2 as cloudinary } from 'cloudinary';
import { getTursoClient } from './turso';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export async function getCloudinaryConfig(): Promise<CloudinaryConfig | null> {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  let apiKey = process.env.CLOUDINARY_API_KEY || '';
  let apiSecret = process.env.CLOUDINARY_API_SECRET || 'WvyrN70XVe0uR1VFDJOdkzDX6iU';

  // Also check database app_settings if env variables are empty
  try {
    const client = getTursoClient();
    const res = await client.execute('SELECT key, value FROM app_settings');
    for (const row of res.rows) {
      if (row.key === 'cloudinary_cloud_name' && row.value) {
        cloudName = String(row.value);
      }
      if (row.key === 'cloudinary_api_key' && row.value) {
        apiKey = String(row.value);
      }
      if (row.key === 'cloudinary_token' && row.value) {
        apiSecret = String(row.value);
      }
    }
  } catch {
    // Ignore error if settings table check fails
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
 * Upload image buffer to Cloudinary or return Base64 fallback if cloud_name not configured
 */
export async function uploadImage(buffer: Buffer, mimeType: string, filename: string): Promise<{ url: string; publicId: string; provider: 'cloudinary' | 'turso_base64' }> {
  const config = await getCloudinaryConfig();

  if (config) {
    const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'wm_products',
      resource_type: 'image',
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      provider: 'cloudinary',
    };
  }

  // Fallback if Cloudinary cloud name / api key not yet provided:
  // Store high-efficiency data URI directly in database so the upload works seamlessly
  const base64Url = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return {
    url: base64Url,
    publicId: `local_${Date.now()}_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`,
    provider: 'turso_base64',
  };
}
