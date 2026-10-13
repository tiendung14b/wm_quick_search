import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { hashPassword, signSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' },
        { status: 400 }
      );
    }

    const client = getTursoClient();
    const result = await client.execute({
      sql: 'SELECT id, username, password_hash, salt, role FROM users WHERE username = ? LIMIT 1',
      args: [username],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const computedHash = hashPassword(password, String(user.salt));

    if (computedHash !== user.password_hash) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Generate token expiring at the end of the day (23:59:59 GMT+7)
    const { token, expiresAt, maxAgeSeconds } = signSessionToken(String(user.username), String(user.role));

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công! Phiên hoạt động có hiệu lực đến hết ngày hôm nay.',
      user: {
        username: user.username,
        role: user.role,
      },
      expiresAt: expiresAt.toISOString(),
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi đăng nhập' },
      { status: 500 }
    );
  }
}
