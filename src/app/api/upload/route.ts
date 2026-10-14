import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, deleteCloudinaryImage, getCloudinaryConfig } from '@/lib/cloudinary';
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

    // Verify Cloudinary configuration first
    const config = await getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cloudinary chưa được cấu hình. Vui lòng vào Cài đặt (nút bánh răng) để nhập Cloud Name, API Key và API Secret trước khi tải ảnh.',
        },
        { status: 400 }
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

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Kích thước ảnh tối đa là 10MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadRes = await uploadImage(buffer, file.type, file.name);

    // If productId was provided, update product in Turso and delete old Cloudinary image if existing
    if (productId && productId !== 'undefined' && productId !== 'null' && productId.trim() !== '') {
      const client = getTursoClient();
      
      // Check if there was an old image public id
      try {
        const oldRow = await client.execute({
          sql: 'SELECT image_public_id FROM products WHERE id = ?',
          args: [Number(productId)],
        });
        const oldPublicId = oldRow.rows[0]?.image_public_id ? String(oldRow.rows[0].image_public_id) : '';
        if (oldPublicId && oldPublicId !== uploadRes.publicId) {
          deleteCloudinaryImage(oldPublicId).catch(() => {});
        }
      } catch {
        // Ignore old image fetch error
      }

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
      provider: 'cloudinary',
      message: 'Tải ảnh lên Cloudinary thành công!',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Lỗi khi tải ảnh lên Cloudinary. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền quản trị viên' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const publicId = searchParams.get('publicId');

    if (publicId) {
      await deleteCloudinaryImage(publicId);
    }

    if (productId) {
      const client = getTursoClient();
      await client.execute({
        sql: `UPDATE products 
              SET image_url = '', 
                  image_public_id = '', 
                  updated_at = datetime('now', '+7 hours') 
              WHERE id = ?`,
        args: [Number(productId)],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa ảnh thành công',
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi xóa ảnh' },
      { status: 500 }
    );
  }
}
