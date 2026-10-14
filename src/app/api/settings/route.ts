import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { getSession } from '@/lib/auth';
import { getCloudinaryConfig, testCloudinaryConnection, parseCloudinaryUrl } from '@/lib/cloudinary';

export async function GET() {
  try {
    const client = getTursoClient();
    const res = await client.execute('SELECT key, value FROM app_settings');
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[String(row.key)] = String(row.value);
    }

    const currentConfig = await getCloudinaryConfig();

    return NextResponse.json({
      success: true,
      settings: {
        cloudinary_cloud_name: settings['cloudinary_cloud_name'] || process.env.CLOUDINARY_CLOUD_NAME || '',
        cloudinary_api_key: settings['cloudinary_api_key'] || process.env.CLOUDINARY_API_KEY || '',
        cloudinary_token: settings['cloudinary_token'] || settings['cloudinary_api_secret'] || process.env.CLOUDINARY_API_SECRET || 'WvyrN70XVe0uR1VFDJOdkzDX6iU',
        cloudinary_url: settings['cloudinary_url'] || process.env.CLOUDINARY_URL || '',
      },
      isConfigured: !!currentConfig,
      configuredCloudName: currentConfig?.cloudName || null,
    });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải cấu hình' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên' }, { status: 401 });
    }

    const body = await req.json();
    const { action, cloudinary_cloud_name, cloudinary_api_key, cloudinary_token, cloudinary_url } = body;

    // Action: Test Cloudinary Connection
    if (action === 'test') {
      let cName = cloudinary_cloud_name?.trim() || '';
      let aKey = cloudinary_api_key?.trim() || '';
      let aSec = cloudinary_token?.trim() || '';

      if (cloudinary_url && cloudinary_url.trim().startsWith('cloudinary://')) {
        const parsed = parseCloudinaryUrl(cloudinary_url.trim());
        if (parsed) {
          cName = parsed.cloudName;
          aKey = parsed.apiKey;
          aSec = parsed.apiSecret;
        }
      }

      const testResult = await testCloudinaryConnection({
        cloudName: cName,
        apiKey: aKey,
        apiSecret: aSec,
      });

      return NextResponse.json(testResult);
    }

    // Otherwise: Save settings
    const client = getTursoClient();

    let finalCloudName = cloudinary_cloud_name?.trim() || '';
    let finalApiKey = cloudinary_api_key?.trim() || '';
    let finalApiSecret = cloudinary_token?.trim() || '';
    const finalUrl = cloudinary_url?.trim() || '';

    // If user provided CLOUDINARY_URL, auto extract components
    if (finalUrl && finalUrl.startsWith('cloudinary://')) {
      const parsed = parseCloudinaryUrl(finalUrl);
      if (parsed) {
        if (!finalCloudName) finalCloudName = parsed.cloudName;
        if (!finalApiKey) finalApiKey = parsed.apiKey;
        if (!finalApiSecret) finalApiSecret = parsed.apiSecret;
      }
    }

    const updates = [
      { key: 'cloudinary_cloud_name', value: finalCloudName },
      { key: 'cloudinary_api_key', value: finalApiKey },
      { key: 'cloudinary_token', value: finalApiSecret },
      { key: 'cloudinary_api_secret', value: finalApiSecret },
      { key: 'cloudinary_url', value: finalUrl },
    ];

    for (const item of updates) {
      await client.execute({
        sql: `INSERT INTO app_settings (key, value, updated_at) 
              VALUES (?, ?, datetime('now', '+7 hours')) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [item.key, item.value],
      });
    }

    // Ping test with saved configuration to report actual status
    const pingRes = await testCloudinaryConnection({
      cloudName: finalCloudName,
      apiKey: finalApiKey,
      apiSecret: finalApiSecret,
    });

    return NextResponse.json({
      success: true,
      message: pingRes.success
        ? `Lưu cấu hình thành công! Kết nối Cloudinary "${finalCloudName}" hoạt động tốt.`
        : `Đã lưu cấu hình, nhưng chưa kết nối được Cloudinary: ${pingRes.message}`,
      isVerified: pingRes.success,
      cloudName: finalCloudName,
    });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi lưu cấu hình' }, { status: 500 });
  }
}
