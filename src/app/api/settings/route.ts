import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const client = getTursoClient();
    const res = await client.execute('SELECT key, value FROM app_settings');
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[String(row.key)] = String(row.value);
    }

    return NextResponse.json({
      success: true,
      settings: {
        cloudinary_token: settings['cloudinary_token'] || process.env.CLOUDINARY_API_SECRET || 'WvyrN70XVe0uR1VFDJOdkzDX6iU',
        cloudinary_cloud_name: settings['cloudinary_cloud_name'] || process.env.CLOUDINARY_CLOUD_NAME || '',
        cloudinary_api_key: settings['cloudinary_api_key'] || process.env.CLOUDINARY_API_KEY || '',
      },
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

    const { cloudinary_cloud_name, cloudinary_api_key, cloudinary_token } = await req.json();
    const client = getTursoClient();

    const updates = [
      { key: 'cloudinary_cloud_name', value: cloudinary_cloud_name?.trim() || '' },
      { key: 'cloudinary_api_key', value: cloudinary_api_key?.trim() || '' },
      { key: 'cloudinary_token', value: cloudinary_token?.trim() || '' },
    ];

    for (const item of updates) {
      await client.execute({
        sql: `INSERT INTO app_settings (key, value, updated_at) 
              VALUES (?, ?, datetime('now', '+7 hours')) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [item.key, item.value],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình Cloudinary thành công!',
    });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi khi lưu cấu hình' }, { status: 500 });
  }
}
