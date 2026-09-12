import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * AniList OAuth (authorization-code grant) — real user sign-in.
 *
 * Register a client at https://anilist.co/settings/developer with redirect
 * URI `<site>/api/auth/anilist/callback`, then set ANILIST_CLIENT_ID and
 * ANILIST_CLIENT_SECRET. The access token is stored in an HMAC-signed
 * HttpOnly cookie — it never reaches client-side JS.
 */

export const AL_COOKIE = 'nekomo_al';
const STATE_COOKIE = 'nekomo_al_state';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AlSession {
  uid: number;
  name: string;
  avatar?: string;
  /** AniList access token — server-side use only. */
  token: string;
  exp: number;
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_KEY || 'dev-only-secret';
}

function hmac(s: string): string {
  return crypto.createHmac('sha256', secret()).update(s).digest('hex');
}

function b64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function unb64(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

export function oauthConfigured(): boolean {
  return !!(process.env.ANILIST_CLIENT_ID && process.env.ANILIST_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/anilist/callback`;
}

export function authorizeUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.ANILIST_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    state,
  });
  return `https://anilist.co/api/v2/oauth/authorize?${p}`;
}

// --- OAuth state cookie (CSRF + deep-link return) ---

export function setOAuthState(state: string, next: string): void {
  const payload = `${state}.${b64(next)}`;
  cookies().set(STATE_COOKIE, `${payload}.${hmac(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
}

export function readOAuthState(): { state: string; next: string } | null {
  const raw = cookies().get(STATE_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (hmac(payload) !== sig) return null;
  const [state, nextB64] = payload.split('.');
  if (!state || !nextB64) return null;
  const next = unb64(nextB64);
  return { state, next: next.startsWith('/') && !next.startsWith('//') ? next : '/' };
}

export function clearOAuthState(): void {
  cookies().delete(STATE_COOKIE);
}

// --- Token exchange / GraphQL ---

export async function exchangeCode(origin: string, code: string): Promise<string> {
  const res = await fetch('https://anilist.co/api/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.ANILIST_CLIENT_ID,
      client_secret: process.env.ANILIST_CLIENT_SECRET,
      redirect_uri: redirectUri(origin),
      code,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('token exchange returned no token');
  return data.access_token;
}

export async function gql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`anilist gql failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error('anilist gql error');
  return data.data as T;
}

export async function fetchViewer(token: string): Promise<{ id: number; name: string; avatar?: string }> {
  const d = await gql<{ Viewer: { id: number; name: string; avatar?: { medium?: string } } }>(
    token,
    'query { Viewer { id name avatar { medium } } }',
  );
  return { id: d.Viewer.id, name: d.Viewer.name, avatar: d.Viewer.avatar?.medium };
}

// --- Session cookie ---

export function packSession(s: Omit<AlSession, 'exp'>): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const body = b64(JSON.stringify({ ...s, exp }));
  const payload = `v1.${exp}.${body}`;
  return `${payload}.${hmac(payload)}`;
}

export function unpackSession(raw: string | undefined): AlSession | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(hmac(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const parts = payload.split('.');
  if (parts.length < 3 || parts[0] !== 'v1') return null;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  try {
    const s = JSON.parse(unb64(parts.slice(2).join('.')));
    if (typeof s.uid !== 'number' || typeof s.token !== 'string') return null;
    return { uid: s.uid, name: s.name, avatar: s.avatar, token: s.token, exp };
  } catch {
    return null;
  }
}

export function getSession(): AlSession | null {
  return unpackSession(cookies().get(AL_COOKIE)?.value);
}

export function setSessionCookie(s: Omit<AlSession, 'exp'>): void {
  cookies().set(AL_COOKIE, packSession(s), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(AL_COOKIE);
}
