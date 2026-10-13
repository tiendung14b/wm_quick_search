import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { getTursoClient } from '@/lib/turso';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập quản trị viên để tải ảnh lên' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn tệp hình ảnh để tải lên' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'Định dạng tệp không hợp lệ. Vui lòng chọn tệp ảnh (JPG, PNG, WebP)' },
        { status: 400 }
      );
    }

    // Limit to 8MB
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Kích thước ảnh tối đa là 8MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadRes = await uploadImage(buffer, file.type, file.name);

    // If productId was provided, update product in Turso
    if (productId && productId !== 'undefined' && productId !== 'null' && productId.trim() !== '') {
      const client = getTursoClient();
      await client.execute({
        sql: `UPDATE products 
              SET image_url = ?, 
                  image_public_id = ?, 
                  updated_at = datetime('now', '+7 hours') 
              WHERE id = ?`,
        args: [uploadRes.url, uploadRes.publicId, Number(productId)],
      });
    }

    return NextResponse.json({
      success: true,
      url: uploadRes.url,
      publicId: uploadRes.publicId,
      provider: uploadRes.provider,
      message: uploadRes.provider === 'cloudinary'
        ? 'Tải ảnh lên Cloudinary thành công!'
        : 'Tải ảnh thành công và đã lưu vào cơ sở dữ liệu!',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi tải ảnh lên' },
      { status: 500 }
    );
  }
}
