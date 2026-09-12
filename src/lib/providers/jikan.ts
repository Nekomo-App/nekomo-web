// Jikan (https://docs.api.jikan.moe) — free, documented anime metadata API.
// All requests run server-side, are throttled to stay under Jikan's
// rate limit (3 req/s, 60 req/min), timed out, retried once, and cached.

import { cached } from '@/lib/cache';
import { getIntegration, recordIntegrationEvent } from '@/lib/admin/store';
import { sleep } from '@/lib/utils';
import type {
  AnimeDetails,
  AnimeFormat,
  AnimeStatus,
  AnimeSummary,
  Character,
  Episode,
  GenreInfo,
  SearchParams,
  SearchResult,
  SeasonName,
  StreamingLink,
  TrailerEntry,
} from '@/lib/types';

const BASE = process.env.ANIME_METADATA_API_URL || 'https://api.jikan.moe/v4';
const TIMEOUT_MS = 9000;
const MIN_INTERVAL_MS = 400; // ~2.5 req/s, under Jikan's 3/s limit

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// Circuit breaker: after repeated hard failures, skip network calls for a
// cooldown window so the UI falls back instantly instead of timing out.
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 90_000;

function circuitOpen(): boolean {
  return consecutiveFailures >= CIRCUIT_THRESHOLD && Date.now() < circuitOpenUntil;
}
function recordSuccess(latencyMs?: number) {
  consecutiveFailures = 0;
  recordIntegrationEvent('jikan', true, latencyMs);
}
function recordFailure(err?: unknown) {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  recordIntegrationEvent('jikan', false, undefined, err instanceof Error ? err.message : 'unknown');
}

// Serial request queue to enforce the throttle interval.
let chain: Promise<unknown> = Promise.resolve();
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed);
    }
  });
  chain = run.catch(() => {});
  return run;
}

async function jikanFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  if (getIntegration('jikan')?.enabled === false) {
    throw new ProviderError('Jikan disabled by administrator');
  }
  if (circuitOpen()) {
    throw new ProviderError('Jikan circuit open — provider marked down');
  }
  return throttled(async () => {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const start = Date.now();
        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Nekomo/0.1 (anime discovery; contact via site)',
          },
          cache: 'no-store',
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new ProviderError(`Jikan responded ${res.status}`, res.status);
          await sleep(1200 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          throw new ProviderError(`Jikan responded ${res.status}`, res.status);
        }
        recordSuccess(Date.now() - start);
        return (await res.json()) as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof ProviderError && err.status && err.status < 500 && err.status !== 429) {
          recordSuccess(); // reachable — 4xx is a real answer, not an outage
          throw err;
        }
        if (attempt === 0) await sleep(1200);
      }
    }
    recordFailure(lastErr);
    throw lastErr instanceof Error ? lastErr : new ProviderError('Jikan request failed');
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const FORMATS = new Set(['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']);

function mapFormat(t?: string): AnimeFormat {
  const up = (t ?? 'TV').toUpperCase();
  return (FORMATS.has(up) ? up : 'TV') as AnimeFormat;
}

function mapStatus(s?: string): AnimeStatus {
  if (!s) return 'COMPLETED';
  const l = s.toLowerCase();
  if (l.includes('currently')) return 'AIRING';
  if (l.includes('not yet')) return 'UPCOMING';
  return 'COMPLETED';
}

export function mapSummary(a: J): AnimeSummary {
  const titles: J[] = a.titles ?? [];
  const english = titles.find((t: J) => t.type === 'English')?.title;
  const japanese = titles.find((t: J) => t.type === 'Japanese')?.title;
  const genres = [
    ...(a.genres ?? []),
    ...(a.explicit_genres ?? []),
    ...(a.themes ?? []),
    ...(a.demographics ?? []),
  ].map((g: J) => g.name as string);
  return {
    id: String(a.mal_id),
    provider: 'jikan',
    title: a.title_english || a.title || 'Untitled',
    altTitle: a.title_english && a.title !== a.title_english ? a.title : undefined,
    japaneseTitle: japanese ?? a.title_japanese ?? undefined,
    synopsis: a.synopsis ?? undefined,
    year: a.year ?? a.aired?.prop?.from?.year ?? undefined,
    format: mapFormat(a.type),
    status: mapStatus(a.status),
    rating: a.score ?? undefined,
    episodeCount: a.episodes ?? undefined,
    poster: a.images?.webp?.image_url ?? a.images?.jpg?.image_url ?? undefined,
    banner: a.images?.webp?.large_image_url ?? a.images?.jpg?.large_image_url ?? undefined,
    genres: [...new Set<string>(genres)],
    hasSub: true, // subtitled releases are near-universal on legal platforms
    hasDub: false, // unknown at list level — only marked true when verified
    hasOfficialStream: (a.licensors ?? []).length > 0 || (a.streaming ?? []).length > 0,
    popularity: a.members ?? a.popularity ?? undefined,
    updatedAt: a.aired?.to ?? undefined,
    broadcast: a.broadcast?.string ?? undefined,
  };
}

function mapEpisode(e: J, durationMin?: number): Episode {
  return {
    id: `ep-${e.mal_id ?? e.episode_id ?? 0}`,
    number: e.mal_id ?? e.episode_id ?? 0,
    title: e.title || `Episode ${e.mal_id ?? e.episode_id ?? ''}`,
    synopsis: e.synopsis ?? undefined,
    durationMin,
    airDate: e.aired ?? undefined,
    thumbnail: e.images?.jpg?.image_url ?? undefined,
    stream: null, // Jikan supplies metadata only — never a stream
  };
}

function mapStreamingLinks(a: J): StreamingLink[] {
  const links: StreamingLink[] = (a.streaming ?? []).map((s: J) => ({
    platform: s.name,
    url: s.url,
    type: 'both' as const,
    note: 'Official platform',
  }));
  if (links.length === 0) {
    const q = encodeURIComponent(a.title_english || a.title || '');
    links.push(
      { platform: 'Crunchyroll', url: `https://www.crunchyroll.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
      { platform: 'Netflix', url: `https://www.netflix.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
      { platform: 'HIDIVE', url: `https://www.hidive.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    );
  }
  return links;
}

function ageRating(r?: string): AnimeDetails['ageRating'] {
  if (!r) return undefined;
  if (r.startsWith('G')) return 'G';
  if (r.startsWith('PG-13')) return 'PG-13';
  if (r.startsWith('PG')) return 'PG';
  if (r.startsWith('R+')) return 'R+';
  if (r.startsWith('Rx')) return 'Rx';
  if (r.startsWith('R')) return 'R';
  return undefined;
}

export async function search(params: SearchParams): Promise<SearchResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const query: Record<string, string | number | undefined> = {
    q: params.q?.slice(0, 100),
    page,
    limit,
    sfw: 'true',
  };

  if (params.formats?.length === 1) query.type = params.formats[0].toLowerCase();
  if (params.statuses?.length === 1) {
    query.status = { AIRING: 'airing', COMPLETED: 'complete', UPCOMING: 'upcoming' }[params.statuses[0]];
  }
  if (params.genres?.length) {
    const map = await genreIdMap();
    const ids = params.genres.map((g) => map.get(g.toLowerCase())).filter(Boolean);
    if (ids.length) query.genres = ids.join(',');
  }
  if (params.minRating) query.min_score = params.minRating;

  // Date filtering: year and/or season → start/end date range.
  if (params.season && params.year) {
    const ranges: Record<SeasonName, [string, string]> = {
      winter: [`${params.year}-01-01`, `${params.year}-03-31`],
      spring: [`${params.year}-04-01`, `${params.year}-06-30`],
      summer: [`${params.year}-07-01`, `${params.year}-09-30`],
      fall: [`${params.year}-10-01`, `${params.year}-12-31`],
    };
    const [s, e] = ranges[params.season];
    query.start_date = s;
    query.end_date = e;
  } else if (params.year) {
    query.start_date = `${params.year}-01-01`;
    query.end_date = `${params.year}-12-31`;
  }

  switch (params.sort) {
    case 'rating':
      query.order_by = 'score';
      query.sort = 'desc';
      break;
    case 'release':
    case 'updated':
      query.order_by = 'start_date';
      query.sort = 'desc';
      break;
    case 'title':
      query.order_by = 'title';
      query.sort = 'asc';
      break;
    default:
      query.order_by = params.q ? undefined : 'members';
      query.sort = params.q ? undefined : 'desc';
  }

  const res = await cached(`jk:search:${JSON.stringify(query)}`, 5 * 60_000, () =>
    jikanFetch<J>('/anime', query),
  );

  let items: AnimeSummary[] = (res.data ?? []).map(mapSummary);
  // Post-filters Jikan can't express.
  if (params.hasOfficialStream) items = items.filter((i) => i.hasOfficialStream);
  if (params.hasDub) items = items.filter((i) => i.hasDub);
  if (params.formats && params.formats.length > 1) items = items.filter((i) => params.formats!.includes(i.format));
  if (params.statuses && params.statuses.length > 1) items = items.filter((i) => params.statuses!.includes(i.status));

  return {
    items,
    total: res.pagination?.items?.total ?? items.length,
    page,
    hasMore: res.pagination?.has_next_page ?? false,
  };
}

export async function top(filter?: 'bypopularity' | 'favorite'): Promise<AnimeSummary[]> {
  const res = await cached(`jk:top:${filter ?? 'all'}`, 10 * 60_000, () =>
    jikanFetch<J>('/top/anime', { limit: 24, filter, sfw: 'true' }),
  );
  return (res.data ?? []).map(mapSummary);
}

export async function seasonal(season?: SeasonName, year?: number): Promise<AnimeSummary[]> {
  const path = season && year ? `/seasons/${year}/${season}` : '/seasons/now';
  const res = await cached(`jk:season:${season ?? 'now'}:${year ?? ''}`, 10 * 60_000, () =>
    jikanFetch<J>(path, { limit: 24, sfw: 'true' }),
  );
  return (res.data ?? []).map(mapSummary);
}

export async function schedule(day: string): Promise<AnimeSummary[]> {
  const res = await cached(`jk:sched:${day}`, 10 * 60_000, () =>
    jikanFetch<J>('/schedules', { day, sfw: 'true', limit: 24 }),
  );
  return (res.data ?? []).map(mapSummary);
}

export const WEEK_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
export type DayKey = (typeof WEEK_DAYS)[number];

export interface WeekSchedule {
  days: Record<DayKey, AnimeSummary[]>;
  unknown: AnimeSummary[];
}

/** Full weekly simulcast calendar — one cached call per day. */
export async function weeklySchedule(): Promise<WeekSchedule> {
  const results = await Promise.all(WEEK_DAYS.map((d) => schedule(d).catch(() => [])));
  const days = {} as Record<DayKey, AnimeSummary[]>;
  WEEK_DAYS.forEach((d, i) => (days[d] = results[i]));
  return { days, unknown: [] };
}

export async function upcoming(): Promise<AnimeSummary[]> {
  const res = await cached('jk:upcoming', 10 * 60_000, () =>
    jikanFetch<J>('/seasons/upcoming', { limit: 24, sfw: 'true' }),
  );
  return (res.data ?? []).map(mapSummary);
}

export async function recentEpisodes(): Promise<AnimeSummary[]> {
  const res = await cached('jk:recent-ep', 5 * 60_000, () =>
    jikanFetch<J>('/watch/episodes', {}),
  );
  const seen = new Set<string>();
  const items: AnimeSummary[] = [];
  for (const row of res.data ?? []) {
    const a = row.entry;
    if (!a || seen.has(String(a.mal_id))) continue;
    seen.add(String(a.mal_id));
    items.push(
      mapSummary({
        ...a,
        title: a.title,
        titles: [],
        genres: [],
        type: 'TV',
        status: 'Currently Airing',
        images: a.images,
      }),
    );
    if (items.length >= 24) break;
  }
  return items;
}

export async function details(id: string): Promise<AnimeDetails> {
  const [full, chars, eps, recs] = await Promise.all([
    cached(`jk:full:${id}`, 15 * 60_000, () => jikanFetch<J>(`/anime/${id}/full`)),
    cached(`jk:chars:${id}`, 30 * 60_000, () =>
      jikanFetch<J>(`/anime/${id}/characters`).catch(() => ({ data: [] })),
    ),
    cached(`jk:eps:${id}`, 15 * 60_000, () =>
      jikanFetch<J>(`/anime/${id}/episodes`, { page: 1 }).catch(() => ({ data: [] })),
    ),
    cached(`jk:recs:${id}`, 30 * 60_000, () =>
      jikanFetch<J>(`/anime/${id}/recommendations`).catch(() => ({ data: [] })),
    ),
  ]);

  const a = full.data;
  const base = mapSummary(a);
  const durationMin = parseDuration(a.duration);

  const characters: Character[] = (chars.data ?? []).slice(0, 14).map((c: J) => {
    const va = (c.voice_actors ?? []).find((v: J) => v.language === 'Japanese') ?? c.voice_actors?.[0];
    return {
      id: String(c.character?.mal_id ?? c.character?.name),
      name: c.character?.name ?? 'Unknown',
      role: c.role === 'Main' ? 'Main' : 'Supporting',
      image: c.character?.images?.webp?.image_url ?? c.character?.images?.jpg?.image_url,
      voiceActor: va
        ? {
            name: va.person?.name ?? 'Unknown',
            language: va.language,
            image: va.person?.images?.jpg?.image_url,
          }
        : undefined,
    };
  });

  const recommendations: AnimeSummary[] = (recs.data ?? []).slice(0, 12).map((r: J) =>
    mapSummary({ ...r.entry, titles: [], genres: [], status: 'Finished Airing' }),
  );

  const relations = (a.relations ?? [])
    .map((rel: J) => ({
      type: rel.relation as string,
      anime: (rel.entry ?? [])
        .filter((e: J) => e.type === 'anime')
        .map((e: J) =>
          mapSummary({
            mal_id: e.mal_id,
            title: e.name,
            titles: [],
            genres: [],
            type: 'TV',
            status: 'Finished Airing',
          }),
        ),
    }))
    .filter((r: { anime: AnimeSummary[] }) => r.anime.length > 0);

  return {
    ...base,
    synopsis: a.synopsis ?? 'No synopsis available.',
    themes: (a.themes ?? []).map((t: J) => t.name),
    demographic: a.demographics?.[0]?.name,
    studios: (a.studios ?? []).map((s: J) => s.name),
    producers: (a.producers ?? []).map((p: J) => p.name),
    season: a.season,
    durationMin,
    ageRating: ageRating(a.rating),
    trailerYoutubeId: a.trailer?.youtube_id ?? undefined,
    streamingLinks: mapStreamingLinks(a),
    characters,
    recommendations,
    relations,
    episodeList: (eps.data ?? []).map((e: J) => mapEpisode(e, durationMin)),
  };
}

function parseDuration(d?: string): number | undefined {
  if (!d) return undefined;
  const hr = d.match(/(\d+)\s*hr/);
  const min = d.match(/(\d+)\s*min/);
  const total = (hr ? +hr[1] * 60 : 0) + (min ? +min[1] : 0);
  return total || undefined;
}

let genreCache: Map<string, number> | null = null;
async function genreIdMap(): Promise<Map<string, number>> {
  if (genreCache) return genreCache;
  const list = await genres();
  genreCache = new Map(list.map((g) => [g.name.toLowerCase(), g.id ?? 0]));
  return genreCache;
}

export async function genres(): Promise<(GenreInfo & { id?: number })[]> {
  const res = await cached('jk:genres', 60 * 60_000, () =>
    jikanFetch<J>('/genres/anime', { filter: 'genres' }),
  );
  return (res.data ?? []).map((g: J) => ({ id: g.mal_id, name: g.name, count: g.count }));
}

export async function trailers(): Promise<TrailerEntry[]> {
  const res = await cached('jk:trailers', 15 * 60_000, () =>
    jikanFetch<J>('/watch/promos/popular', { limit: 16 }),
  );
  const out: TrailerEntry[] = [];
  for (const row of res.data ?? []) {
    const yt = row.trailer?.youtube_id;
    if (!yt) continue;
    out.push({
      animeId: String(row.entry?.mal_id ?? yt),
      title: row.entry?.title ?? row.title ?? 'Trailer',
      poster: row.entry?.images?.webp?.image_url ?? row.entry?.images?.jpg?.image_url,
      youtubeId: yt,
    });
    if (out.length >= 12) break;
  }
  return out;
}
