import { NextResponse } from 'next/server';
import { getSession } from '@/lib/anilist-auth';

/** GET /api/auth/me — current AniList session profile (never exposes the token). */
export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: s.uid, name: s.name, avatar: s.avatar, provider: 'anilist' as const },
  });
}
