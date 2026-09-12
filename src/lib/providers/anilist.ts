// AniList (https://graphql.anilist.co) — free, documented, open GraphQL API.
// No key required (~90 req/min). Used as the secondary metadata provider:
// when Jikan is down/disabled, the facade falls through to AniList.
// IDs stay normalized to MyAnimeList IDs (idMal) so deep links don't change.

import { getIntegration, recordIntegrationEvent } from '@/lib/admin/store';
import { sleep } from '@/lib/utils';
import type {
  AnimeDetails,
  AnimeFormat,
  AnimeStatus,
  AnimeSummary,
  Episode,
  GenreInfo,
  SearchParams,
  SearchResult,
  SeasonName,
  StreamingLink,
} from '@/lib/types';
import { ProviderError } from './jikan';

const ENDPOINT = 'https://graphql.anilist.co';
const TIMEOUT_MS = 9000;
const MIN_INTERVAL_MS = 700; // ~85/min, under AniList's 90/min limit

let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 90_000;

function circuitOpen(): boolean {
  return consecutiveFailures >= CIRCUIT_THRESHOLD && Date.now() < circuitOpenUntil;
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

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (getIntegration('anilist')?.enabled === false) {
    throw new ProviderError('AniList disabled by administrator');
  }
  if (circuitOpen()) throw new ProviderError('AniList circuit open — provider marked down');

  return throttled(async () => {
    const started = Date.now();
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      });
      const latency = Date.now() - started;
      if (res.status === 429 || res.status >= 500) {
        consecutiveFailures++;
        if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        }
        recordIntegrationEvent('anilist', false, latency, `HTTP ${res.status}`);
        throw new ProviderError(`AniList responded ${res.status}`, res.status);
      }
      const json = await res.json();
      if (json.errors?.length) {
        throw new ProviderError(`AniList error: ${json.errors[0].message}`);
      }
      consecutiveFailures = 0;
      recordIntegrationEvent('anilist', true, latency);
      return json.data as T;
    } catch (err) {
      if (!(err instanceof ProviderError)) {
        consecutiveFailures++;
        if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        }
        recordIntegrationEvent('anilist', false, Date.now() - started, err instanceof Error ? err.message : 'unknown');
        throw new ProviderError('AniList request failed');
      }
      throw err;
    }
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const FMT: Record<string, AnimeFormat> = {
  TV: 'TV', TV_SHORT: 'TV', MOVIE: 'MOVIE', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'SPECIAL', MUSIC: 'MUSIC',
};

function mapStatus(s?: string): AnimeStatus {
  if (s === 'RELEASING') return 'AIRING';
  if (s === 'NOT_YET_RELEASED') return 'UPCOMING';
  return 'COMPLETED';
}

const SEASON_MAP: Record<SeasonName, string> = {
  winter: 'WINTER', spring: 'SPRING', summer: 'SUMMER', fall: 'FALL',
};

function mapSummary(m: J): AnimeSummary {
  const streams: J[] = (m.externalLinks ?? []).filter((l: J) => l.type === 'STREAMING');
  return {
    id: String(m.idMal ?? m.id),
    provider: 'anilist',
    title: m.title?.english || m.title?.romaji || 'Untitled',
    altTitle: m.title?.english && m.title.romaji !== m.title.english ? m.title.romaji : undefined,
    japaneseTitle: m.title?.native ?? undefined,
    synopsis: typeof m.description === 'string' ? m.description.replace(/<[^>]*>/g, '') : undefined,
    year: m.seasonYear ?? m.startDate?.year ?? undefined,
    format: FMT[m.format] ?? 'TV',
    status: mapStatus(m.status),
    rating: m.averageScore ? m.averageScore / 10 : undefined,
    episodeCount: m.episodes ?? undefined,
    poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? undefined,
    banner: m.bannerImage ?? undefined,
    genres: [...new Set<string>([...(m.genres ?? [])])],
    hasSub: true,
    hasDub: false,
    hasOfficialStream: streams.length > 0,
    popularity: m.popularity ?? undefined,
    broadcast: m.nextAiringEpisode?.airingAt
      ? `Next episode ${new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleString()}`
      : undefined,
  };
}

const MEDIA_FIELDS = `
  id idMal
  title { english romaji native }
  description(asHtml: false)
  format status seasonYear episodes duration averageScore popularity
  coverImage { extraLarge large } bannerImage
  genres studios(isMain: true) { nodes { name } }
  season nextAiringEpisode { airingAt episode }
  externalLinks { site url type }
  streamingEpisodes { title url site thumbnail }
  trailer { id site }
  startDate { year }
`;

export async function search(params: SearchParams): Promise<SearchResult> {
  const page = params.page ?? 1;
  const perPage = params.limit ?? 24;
  const variables: Record<string, unknown> = { page, perPage };
  const filters: string[] = ['type: ANIME', 'isAdult: false'];
  if (params.q) {
    filters.push('search: $q');
    variables.q = params.q.slice(0, 100);
  }
  if (params.genres?.length) {
    filters.push('genre_in: $genres');
    variables.genres = params.genres.slice(0, 6);
  }
  if (params.year) {
    filters.push('seasonYear: $year');
    variables.year = params.year;
  }
  if (params.season) {
    filters.push('season: $season');
    variables.season = SEASON_MAP[params.season];
  }
  if (params.formats?.length === 1) {
    filters.push('format: $format');
    variables.format = Object.entries(FMT).find(([, v]) => v === params.formats![0])?.[0];
  }
  if (params.statuses?.length === 1) {
    filters.push('status: $status');
    variables.status = { AIRING: 'RELEASING', COMPLETED: 'FINISHED', UPCOMING: 'NOT_YET_RELEASED' }[params.statuses[0]];
  }
  const sort =
    params.sort === 'rating' ? 'SCORE_DESC'
    : params.sort === 'title' ? 'TITLE_ENGLISH'
    : params.sort === 'release' || params.sort === 'updated' ? 'START_DATE_DESC'
    : 'POPULARITY_DESC';

  const data = await gql<J>(
    `query($page: Int, $perPage: Int, $q: String, $genres: [String], $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total hasNextPage }
        media(${filters.join(', ')}, sort: ${sort}) { ${MEDIA_FIELDS} }
      }
    }`,
    variables,
  );

  let items: AnimeSummary[] = (data?.Page?.media ?? []).map(mapSummary);
  if (params.minRating) items = items.filter((i) => (i.rating ?? 0) >= params.minRating!);
  if (params.hasOfficialStream) items = items.filter((i) => i.hasOfficialStream);
  return {
    items,
    total: data?.Page?.pageInfo?.total ?? items.length,
    page,
    hasMore: data?.Page?.pageInfo?.hasNextPage ?? false,
  };
}

export async function top(filter?: 'bypopularity' | 'favorite'): Promise<AnimeSummary[]> {
  const sort = filter === 'favorite' ? 'SCORE_DESC' : 'POPULARITY_DESC';
  const data = await gql<J>(
    `query { Page(perPage: 24) { media(type: ANIME, isAdult: false, sort: ${sort}) { ${MEDIA_FIELDS} } } }`,
    {},
  );
  return (data?.Page?.media ?? []).map(mapSummary);
}

export async function seasonal(season?: SeasonName, year?: number): Promise<AnimeSummary[]> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const s = season ?? (['winter', 'spring', 'summer', 'fall'][Math.floor(now.getMonth() / 3)] as SeasonName);
  const data = await gql<J>(
    `query($y: Int, $s: MediaSeason) {
      Page(perPage: 24) { media(type: ANIME, isAdult: false, seasonYear: $y, season: $s, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} } }
    }`,
    { y, s: SEASON_MAP[s] },
  );
  return (data?.Page?.media ?? []).map(mapSummary);
}

function mapStreamingLinks(m: J): StreamingLink[] {
  const links: StreamingLink[] = (m.externalLinks ?? [])
    .filter((l: J) => l.type === 'STREAMING' && l.url)
    .map((l: J) => ({ platform: l.site, url: l.url, type: 'both' as const, note: 'Official platform' }));
  if (!links.length) {
    const q = encodeURIComponent(m.title?.english || m.title?.romaji || '');
    links.push(
      { platform: 'Crunchyroll', url: `https://www.crunchyroll.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
      { platform: 'Netflix', url: `https://www.netflix.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
      { platform: 'HIDIVE', url: `https://www.hidive.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    );
  }
  return links;
}

export async function details(malId: string): Promise<AnimeDetails> {
  const id = Number(malId);
  if (!Number.isInteger(id)) throw new ProviderError('Invalid MAL id for AniList');
  const data = await gql<J>(
    `query($id: Int) { Media(idMal: $id, type: ANIME) { ${MEDIA_FIELDS}
      characters(perPage: 14, sort: ROLE) { nodes { name { full } image { medium } } }
      recommendations(perPage: 12) { nodes { mediaRecommendation { ${MEDIA_FIELDS} } } }
    } }`,
    { id },
  );
  const m = data?.Media;
  if (!m) throw new ProviderError('AniList: not found', 404);

  const base = mapSummary(m);
  const episodeList: Episode[] = (m.streamingEpisodes ?? []).map((e: J, i: number) => ({
    id: `ep-${i + 1}`,
    number: i + 1,
    title: e.title || `Episode ${i + 1}`,
    thumbnail: e.thumbnail ?? undefined,
    synopsis: `${e.site} — official platform`,
    stream: null,
  }));
  // Fill remaining episodes when AniList has a count but no streaming entries
  if (!episodeList.length && m.episodes) {
    for (let i = 1; i <= Math.min(m.episodes, 100); i++) {
      episodeList.push({ id: `ep-${i}`, number: i, title: `Episode ${i}`, stream: null });
    }
  }

  return {
    ...base,
    synopsis: base.synopsis ?? 'No synopsis available.',
    themes: [],
    studios: (m.studios?.nodes ?? []).map((s: J) => s.name),
    producers: [],
    season: m.season?.toLowerCase(),
    durationMin: m.duration ?? undefined,
    trailerYoutubeId: m.trailer?.site === 'youtube' ? m.trailer.id : undefined,
    streamingLinks: mapStreamingLinks(m),
    characters: (m.characters?.nodes ?? []).map((c: J) => ({
      id: c.name?.full ?? 'unknown',
      name: c.name?.full ?? 'Unknown',
      role: 'Supporting' as const,
      image: c.image?.medium ?? undefined,
    })),
    recommendations: (m.recommendations?.nodes ?? [])
      .map((r: J) => r.mediaRecommendation)
      .filter(Boolean)
      .map(mapSummary),
    relations: [],
    episodeList,
  };
}

export async function genres(): Promise<GenreInfo[]> {
  const data = await gql<J>(`query { GenreCollection }`, {});
  return (data?.GenreCollection ?? []).map((name: string) => ({ name }));
}
