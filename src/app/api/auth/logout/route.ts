import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/anilist-auth';

/** Sign out of the AniList session. GET supports plain links, POST for fetch(). */
export async function GET(req: NextRequest) {
  clearSessionCookie();
  return NextResponse.redirect(new URL('/login', new URL(req.url).origin));
}

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
