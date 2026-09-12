// Kitsu (https://kitsu.io/api/edge) — free, documented JSON:API, no key needed.
// Third metadata provider in the chain. Kitsu IDs are prefixed "kitsu-" so
// detail requests route straight back here instead of the MAL-id providers.

import { getIntegration, recordIntegrationEvent } from '@/lib/admin/store';
import { sleep } from '@/lib/utils';
import type {
  AnimeDetails,
  AnimeFormat,
  AnimeStatus,
  AnimeSummary,
  Episode,
  SearchParams,
  SearchResult,
  StreamingLink,
} from '@/lib/types';
import { ProviderError } from './jikan';

const BASE = 'https://kitsu.io/api/edge';
const TIMEOUT_MS = 9000;
const MIN_INTERVAL_MS = 600;

export const isKitsuId = (id: string) => id.startsWith('kitsu-');
const stripPrefix = (id: string) => id.replace(/^kitsu-/, '');

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function circuitOpen(): boolean {
  return consecutiveFailures >= 3 && Date.now() < circuitOpenUntil;
}

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

async function kitsuFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  if (getIntegration('kitsu')?.enabled === false) {
    throw new ProviderError('Kitsu disabled by administrator');
  }
  if (circuitOpen()) throw new ProviderError('Kitsu circuit open — provider marked down');

  return throttled(async () => {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    const started = Date.now();
    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: 'application/vnd.api+json' },
        cache: 'no-store',
      });
      const latency = Date.now() - started;
      if (!res.ok) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) circuitOpenUntil = Date.now() + 90_000;
        recordIntegrationEvent('kitsu', false, latency, `HTTP ${res.status}`);
        throw new ProviderError(`Kitsu responded ${res.status}`, res.status);
      }
      consecutiveFailures = 0;
      recordIntegrationEvent('kitsu', true, latency);
      return (await res.json()) as T;
    } catch (err) {
      if (!(err instanceof ProviderError)) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) circuitOpenUntil = Date.now() + 90_000;
        recordIntegrationEvent('kitsu', false, Date.now() - started, err instanceof Error ? err.message : 'unknown');
        throw new ProviderError('Kitsu request failed');
      }
      throw err;
    }
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const FMT: Record<string, AnimeFormat> = {
  TV: 'TV', movie: 'MOVIE', OVA: 'OVA', ONA: 'ONA', special: 'SPECIAL', music: 'MUSIC',
};

function mapStatus(s?: string): AnimeStatus {
  if (s === 'current') return 'AIRING';
  if (s === 'unreleased' || s === 'tba') return 'UPCOMING';
  return 'COMPLETED';
}

function mapSummary(item: J): AnimeSummary {
  const a = item.attributes ?? {};
  return {
    id: `kitsu-${item.id}`,
    provider: 'kitsu',
    title: a.titles?.en || a.canonicalTitle || a.titles?.en_jp || 'Untitled',
    altTitle: a.titles?.en_jp && a.titles.en_jp !== a.titles?.en ? a.titles.en_jp : undefined,
    japaneseTitle: a.titles?.ja_jp ?? undefined,
    synopsis: a.synopsis ?? a.description ?? undefined,
    year: a.startDate ? new Date(a.startDate).getFullYear() : undefined,
    format: FMT[a.subtype] ?? 'TV',
    status: mapStatus(a.status),
    rating: a.averageRating ? Number(a.averageRating) / 10 : undefined,
    episodeCount: a.episodeCount ?? undefined,
    poster: a.posterImage?.large ?? a.posterImage?.medium ?? undefined,
    banner: a.coverImage?.large ?? a.coverImage?.original ?? undefined,
    genres: [],
    hasSub: true,
    hasDub: false,
    hasOfficialStream: false,
    popularity: a.userCount ?? a.favoritesCount ?? undefined,
  };
}

export async function search(params: SearchParams): Promise<SearchResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const q: Record<string, string | number | undefined> = {
    'page[limit]': limit,
    'page[offset]': (page - 1) * limit,
    'filter[text]': params.q?.slice(0, 100) || undefined,
    sort:
      params.sort === 'rating' ? '-average_rating'
      : params.sort === 'release' || params.sort === 'updated' ? '-start_date'
      : params.sort === 'title' ? 'canonical_title'
      : '-user_count',
  };
  if (params.formats?.length === 1) {
    const sub = Object.entries(FMT).find(([, v]) => v === params.formats![0])?.[0];
    if (sub) q['filter[subtype]'] = sub.toLowerCase();
  }
  if (params.statuses?.length === 1) {
    q['filter[status]'] = { AIRING: 'current', COMPLETED: 'finished', UPCOMING: 'unreleased' }[params.statuses[0]];
  }
  if (params.year) q['filter[year]'] = params.year;
  if (params.season) q['filter[season]'] = params.season;
  if (params.genres?.length) q['filter[categories]'] = params.genres.slice(0, 6).join(',').toLowerCase();

  const res = await kitsuFetch<J>('/anime', q);
  let items: AnimeSummary[] = (res.data ?? []).map(mapSummary);
  if (params.minRating) items = items.filter((i) => (i.rating ?? 0) >= params.minRating!);
  return {
    items,
    total: res.meta?.count ?? items.length,
    page,
    hasMore: (res.links?.next ? true : false),
  };
}

export async function trending(): Promise<AnimeSummary[]> {
  const res = await kitsuFetch<J>('/trending/anime', { 'page[limit]': 24 });
  return (res.data ?? []).map(mapSummary);
}

function streamingLinksFor(title: string): StreamingLink[] {
  const q = encodeURIComponent(title);
  return [
    { platform: 'Crunchyroll', url: `https://www.crunchyroll.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    { platform: 'Netflix', url: `https://www.netflix.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    { platform: 'HIDIVE', url: `https://www.hidive.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
  ];
}

export async function details(id: string): Promise<AnimeDetails> {
  const res = await kitsuFetch<J>(`/anime/${stripPrefix(id)}`, {
    'include': 'genres',
  });
  const item = res.data;
  if (!item) throw new ProviderError('Kitsu: not found', 404);
  const a = item.attributes ?? {};
  const base = mapSummary(item);

  const genreNames: string[] = (res.included ?? [])
    .filter((x: J) => x.type === 'genres')
    .map((x: J) => x.attributes?.name)
    .filter(Boolean);
  base.genres = genreNames;
  base.provider = 'kitsu';

  const episodeList: Episode[] = [];
  if (a.episodeCount) {
    for (let i = 1; i <= Math.min(a.episodeCount, 100); i++) {
      episodeList.push({ id: `ep-${i}`, number: i, title: `Episode ${i}`, stream: null });
    }
  }

  return {
    ...base,
    synopsis: base.synopsis ?? 'No synopsis available.',
    themes: [],
    studios: [],
    producers: [],
    durationMin: a.episodeLength ?? undefined,
    ageRating: a.ageRating ?? undefined,
    streamingLinks: streamingLinksFor(base.title),
    characters: [],
    recommendations: [],
    relations: [],
    episodeList,
  };
}
