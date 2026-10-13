import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSeconds = Math.max(0, session.exp - nowSec);

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.username,
      role: session.role,
    },
    expiresAt: new Date(session.exp * 1000).toISOString(),
    remainingSeconds,
  });
}
