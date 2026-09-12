// AniSkip (https://api.aniskip.com) — open-source API for episode
// intro/outro timestamps, keyed by MyAnimeList ID + episode number.
// Adds "skip intro" data to the watch player where available.

import { getIntegration, recordIntegrationEvent } from '@/lib/admin/store';

const BASE = 'https://api.aniskip.com/v1';
const TIMEOUT_MS = 6000;

export interface SkipTimes {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

/** Fetch OP/ED skip windows for a MAL-id episode. Never throws. */
export async function getSkipTimes(
  malId: string,
  episodeNumber: number,
  episodeLengthMin?: number,
): Promise<SkipTimes> {
  if (getIntegration('aniskip')?.enabled === false) return {};
  if (!/^\d+$/.test(malId)) return {};

  const started = Date.now();
  try {
    const url = new URL(`${BASE}/skip-times/${malId}/${episodeNumber}`);
    url.searchParams.set('types', 'op');
    url.searchParams.append('types', 'ed');
    if (episodeLengthMin) url.searchParams.set('episodeLength', String(episodeLengthMin));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      recordIntegrationEvent('aniskip', false, Date.now() - started, `HTTP ${res.status}`);
      return {};
    }
    const json = await res.json();
    const results: {
      skipType: string;
      interval: { startTime: number; endTime: number };
    }[] = json.results ?? [];

    const out: SkipTimes = {};
    for (const r of results) {
      if (r.skipType === 'op') out.intro = { start: r.interval.startTime, end: r.interval.endTime };
      if (r.skipType === 'ed') out.outro = { start: r.interval.startTime, end: r.interval.endTime };
    }
    recordIntegrationEvent('aniskip', true, Date.now() - started);
    return out;
  } catch {
    recordIntegrationEvent('aniskip', false, Date.now() - started, 'request failed');
    return {};
  }
}
