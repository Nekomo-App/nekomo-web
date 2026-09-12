import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUrl, oauthConfigured, setOAuthState } from '@/lib/anilist-auth';

/** GET /api/auth/anilist?next=/path — start the AniList OAuth flow. */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const next = req.nextUrl.searchParams.get('next') ?? '/';

  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL('/login?error=oauth-not-configured', origin));
  }

  const state = crypto.randomBytes(16).toString('hex');
  setOAuthState(state, next);
  return NextResponse.redirect(authorizeUrl(origin, state));
}
