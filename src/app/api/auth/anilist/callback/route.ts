import { NextRequest, NextResponse } from 'next/server';
import {
  clearOAuthState,
  exchangeCode,
  fetchViewer,
  readOAuthState,
  setSessionCookie,
} from '@/lib/anilist-auth';

/** GET /api/auth/anilist/callback — complete OAuth, set the session cookie. */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = readOAuthState();
  clearOAuthState();

  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(new URL('/login?error=oauth-state', origin));
  }

  try {
    const token = await exchangeCode(origin, code);
    const viewer = await fetchViewer(token);
    setSessionCookie({ uid: viewer.id, name: viewer.name, avatar: viewer.avatar, token });
  } catch {
    return NextResponse.redirect(new URL('/login?error=oauth-failed', origin));
  }

  const next = encodeURIComponent(saved.next);
  return NextResponse.redirect(new URL(`/login?oauth=done&next=${next}`, origin));
}
