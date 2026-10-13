import crypto from 'crypto';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'wm_quick_search_jwt_super_secret_key_2026_winmart_secure!';
export const COOKIE_NAME = 'wm_session';

export interface UserSession {
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Calculates end of the current day (23:59:59 in GMT+7 Vietnam timezone)
 */
export function getEndOfDayExpiry(): { expiresAt: Date; maxAgeSeconds: number } {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnNow = new Date(now.getTime() + vnOffsetMs);

  // Set to 23:59:59.999 of the VN day
  const vnEndOfDay = new Date(vnNow);
  vnEndOfDay.setUTCHours(23, 59, 59, 999);

  // Convert back to UTC timestamp
  const expiresAt = new Date(vnEndOfDay.getTime() - vnOffsetMs);
  const diffMs = expiresAt.getTime() - now.getTime();
  const maxAgeSeconds = Math.max(60, Math.floor(diffMs / 1000));

  return { expiresAt, maxAgeSeconds };
}

/**
 * Hash password using PBKDF2 sha256 with 100,000 iterations
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'utf-8'), 100000, 32, 'sha256').toString('hex');
}

/**
 * Generate a cryptographically signed session token
 */
export function signSessionToken(username: string, role: string = 'admin'): { token: string; expiresAt: Date; maxAgeSeconds: number } {
  const { expiresAt, maxAgeSeconds } = getEndOfDayExpiry();
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: UserSession = {
    username,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const token = `${headerB64}.${payloadB64}.${signature}`;
  return { token, expiresAt, maxAgeSeconds };
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: UserSession = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    const nowSec = Math.floor(Date.now() / 1000);

    // Verify token has not passed end of day
    if (payload.exp < nowSec) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get current user session from request cookies
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
