import { NextRequest, NextResponse } from 'next/server';
import { getSession, gql } from '@/lib/anilist-auth';
import { rateLimit } from '@/lib/ratelimit';

/**
 * POST /api/anilist/progress { malId, progress }
 * Writes episode progress back to the signed-in user's AniList list.
 */
export async function POST(req: NextRequest) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });
  if (!rateLimit(`al-progress:${s.uid}`, 30, 60_000).ok) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  let body: { malId?: unknown; progress?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const malId = Number(body.malId);
  const progress = Number(body.progress);
  if (!Number.isInteger(malId) || malId <= 0 || !Number.isInteger(progress) || progress < 0 || progress > 10000) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // Resolve MAL id → AniList media id, then save progress.
    const m = await gql<{ Media: { id: number } | null }>(
      s.token,
      'query ($mal: Int) { Media(idMal: $mal, type: ANIME) { id } }',
      { mal: malId },
    );
    if (!m.Media) return NextResponse.json({ error: 'not-on-anilist' }, { status: 404 });

    const r = await gql<{ SaveMediaListEntry: { id: number; progress: number } }>(
      s.token,
      `mutation ($mediaId: Int, $progress: Int) {
        SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: CURRENT) { id progress }
      }`,
      { mediaId: m.Media.id, progress },
    );
    return NextResponse.json({ ok: true, progress: r.SaveMediaListEntry.progress });
  } catch {
    return NextResponse.json({ error: 'anilist-unreachable' }, { status: 502 });
  }
}
