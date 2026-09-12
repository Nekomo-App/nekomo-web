import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin session auth — an HMAC-signed, HttpOnly cookie.
 *
 * This is intentionally small: there is no user database, so admin access is
 * gated by a shared key (ADMIN_KEY env). The cookie is signed with AUTH_SECRET
 * (falling back to ADMIN_KEY) so it can't be forged or tampered with.
 *
 * A production deployment should replace this with real sessions backed by the
 * user database; the requireAdmin() seam stays the same.
 */

export const ADMIN_COOKIE = 'nekomo_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function adminKey(): string | undefined {
  return process.env.ADMIN_KEY || (process.env.NODE_ENV !== 'production' ? 'dev-admin-key' : undefined);
}

function signingSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_KEY || 'dev-only-secret';
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

/** Constant-time key comparison. */
export function checkAdminKey(key: string): boolean {
  const expected = adminKey();
  if (!expected || typeof key !== 'string') return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // still burn a comparison to reduce timing signal
    crypto.timingSafeEqual(Buffer.from(expected), b.compare(b) ? b : b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function createAdminToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [role, expStr, sig] = token.split('.');
  if (role !== 'admin' || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = hmac(`${role}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** For route handlers and server components. */
export function isAdmin(): boolean {
  return verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
}

export function setAdminCookie(): void {
  cookies().set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearAdminCookie(): void {
  cookies().delete(ADMIN_COOKIE);
}
