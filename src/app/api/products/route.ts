import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';

    const client = getTursoClient();

    let sql = 'SELECT id, plu, name, category, unit, image_url, image_public_id, note, updated_at FROM products WHERE 1=1';
    const args: (string | number)[] = [];

    if (category && category !== 'all' && category !== 'Tất cả') {
      sql += ' AND category = ?';
      args.push(category);
    }

    if (q) {
      sql += ' AND (plu LIKE ? OR name LIKE ? OR note LIKE ?)';
      const queryPattern = `%${q}%`;
      args.push(queryPattern, queryPattern, queryPattern);
    }

    sql += ' ORDER BY category ASC, plu ASC';

    const result = await client.execute({ sql, args });

    // Also get list of all unique categories
    const catResult = await client.execute('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = catResult.rows.map((r) => String(r.category));

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      categories,
      products: result.rows,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách sản phẩm' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập quản trị viên để thực hiện' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { plu, name, category, unit = 'kg', note = '', image_url = '' } = body;

    if (!plu || !name || !category) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ Mã PLU, Tên sản phẩm và Danh mục' },
        { status: 400 }
      );
    }

    const client = getTursoClient();

    const insertResult = await client.execute({
      sql: `INSERT INTO products (plu, name, category, unit, note, image_url, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`,
      args: [String(plu).trim(), String(name).trim(), String(category).trim(), String(unit).trim(), String(note).trim(), String(image_url).trim()],
    });

    return NextResponse.json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      id: Number(insertResult.lastInsertRowid),
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi thêm sản phẩm mới' },
      { status: 500 }
    );
  }
}
