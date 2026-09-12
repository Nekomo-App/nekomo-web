import { NextResponse } from 'next/server';
import { getSession, gql } from '@/lib/anilist-auth';

export interface AlListEntry {
  malId: number | null;
  title: string;
  poster?: string;
  progress: number;
  episodes?: number;
  status: string;
}

/** GET /api/anilist/list — the signed-in user's current/paused anime list. */
export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ entries: [] });

  try {
    const d = await gql<{
      MediaListCollection: {
        lists: {
          entries: {
            status: string;
            progress: number;
            media: {
              idMal: number | null;
              episodes?: number;
              title: { romaji: string; english?: string };
              coverImage?: { medium?: string };
            };
          }[];
        }[];
      };
    }>(
      s.token,
      `query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME, status_in: [CURRENT, PAUSED, REPEATING]) {
          lists { entries {
            status progress
            media { idMal episodes title { romaji english } coverImage { medium } }
          } }
        }
      }`,
      { userId: s.uid },
    );

    const entries: AlListEntry[] = d.MediaListCollection.lists
      .flatMap((l) => l.entries)
      .map((e) => ({
        malId: e.media.idMal,
        title: e.media.title.english || e.media.title.romaji,
        poster: e.media.coverImage?.medium,
        progress: e.progress,
        episodes: e.media.episodes,
        status: e.status,
      }));
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [], error: 'anilist-unreachable' });
  }
}
