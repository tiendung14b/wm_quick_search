import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { getSession } from '@/lib/auth';
import { deleteCloudinaryImage } from '@/lib/cloudinary';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập quản trị viên để chỉnh sửa' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { plu, name, category, unit, note, image_url } = body;

    if (image_url && String(image_url).trim().startsWith('data:')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không được phép lưu ảnh Base64 vào cơ sở dữ liệu. Vui lòng tải ảnh lên Cloudinary.',
        },
        { status: 400 }
      );
    }

    const client = getTursoClient();

    await client.execute({
      sql: `UPDATE products 
            SET plu = COALESCE(?, plu),
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                unit = COALESCE(?, unit),
                note = COALESCE(?, note),
                image_url = COALESCE(?, image_url),
                updated_at = datetime('now', '+7 hours')
            WHERE id = ?`,
      args: [
        plu ? String(plu).trim() : null,
        name ? String(name).trim() : null,
        category ? String(category).trim() : null,
        unit ? String(unit).trim() : null,
        note !== undefined ? String(note).trim() : null,
        image_url !== undefined ? String(image_url).trim() : null,
        Number(id),
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin sản phẩm thành công',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật sản phẩm' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập quản trị viên để xóa' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = getTursoClient();

    // Check if product has Cloudinary image
    try {
      const row = await client.execute({
        sql: 'SELECT image_public_id FROM products WHERE id = ?',
        args: [Number(id)],
      });
      const publicId = row.rows[0]?.image_public_id ? String(row.rows[0].image_public_id) : '';
      if (publicId) {
        deleteCloudinaryImage(publicId).catch(() => {});
      }
    } catch {
      // Ignore
    }

    await client.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [Number(id)],
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa sản phẩm' },
      { status: 500 }
    );
  }
}
