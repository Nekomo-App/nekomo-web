// Provider facade: the only module the app talks to for catalog data.
// Primary: Jikan (documented metadata API). Fallback: bundled local dataset.

import type {
  AnimeDetails,
  AnimeSummary,
  BrokenSourceReport,
  Episode,
  GenreInfo,
  SearchParams,
  SearchResult,
  SeasonName,
  TrailerEntry,
} from '@/lib/types';
import * as jikan from './jikan';
import * as local from './local';
import { getAuthorizedStreamFor } from './streaming';

const isLocalId = (id: string) => id.startsWith('loc-');

function logProviderError(context: string, err: unknown) {
  // Never log request URLs with keys or response bodies — message + name only.
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown';
  console.error(`[provider:${context}] ${msg}`);
}

export async function getAnimeSearchResults(params: SearchParams): Promise<SearchResult> {
  try {
    const remote = await jikan.search(params);
    const locals = local.localSearch(params);
    // Merge local originals first when the query is light, so owned content surfaces.
    if (locals.items.length && (params.q || params.hasOfficialStream || !params.sort || params.sort === 'popularity')) {
      const seen = new Set(remote.items.map((i) => i.id));
      const merged = [
        ...locals.items.slice(0, 6),
        ...remote.items.filter((i) => !seen.has(i.id)),
      ];
      return { ...remote, items: merged };
    }
    return remote;
  } catch (err) {
    logProviderError('search', err);
    return local.localSearch(params);
  }
}

export async function getAnimeDetails(id: string): Promise<AnimeDetails | null> {
  if (isLocalId(id)) return local.localById(id);
  try {
    return await jikan.details(id);
  } catch (err) {
    logProviderError(`details:${id}`, err);
    return null;
  }
}

export async function getAnimeEpisodes(id: string): Promise<Episode[]> {
  const d = await getAnimeDetails(id);
  return d?.episodeList ?? [];
}

export async function getAnimeCharacters(id: string) {
  const d = await getAnimeDetails(id);
  return d?.characters ?? [];
}

export async function getAnimeRecommendations(id: string): Promise<AnimeSummary[]> {
  const d = await getAnimeDetails(id);
  return d?.recommendations ?? [];
}

export async function getSeasonalAnime(season?: SeasonName, year?: number): Promise<AnimeSummary[]> {
  try {
    const items = await jikan.seasonal(season, year);
    return items.length ? items : local.localSeasonal(season, year);
  } catch (err) {
    logProviderError('seasonal', err);
    return local.localSeasonal(season, year);
  }
}

export async function getTrendingAnime(): Promise<AnimeSummary[]> {
  try {
    const items = await jikan.top();
    const locals = local.localTrending().slice(0, 4);
    return [...locals, ...items];
  } catch (err) {
    logProviderError('trending', err);
    return local.localTrending();
  }
}

export async function getPopularAnime(): Promise<AnimeSummary[]> {
  try {
    return await jikan.top('bypopularity');
  } catch (err) {
    logProviderError('popular', err);
    return local.localTrending();
  }
}

export async function getTopRatedAnime(): Promise<AnimeSummary[]> {
  try {
    return await jikan.top('favorite');
  } catch (err) {
    logProviderError('top-rated', err);
    return local.localTrending();
  }
}

export async function getUpcomingAnime(): Promise<AnimeSummary[]> {
  try {
    return await jikan.upcoming();
  } catch (err) {
    logProviderError('upcoming', err);
    return local.localSeasonal().filter((a) => a.status === 'UPCOMING');
  }
}

export async function getRecentlyUpdatedAnime(): Promise<AnimeSummary[]> {
  try {
    const items = await jikan.recentEpisodes();
    return items.length ? items : local.localTrending();
  } catch (err) {
    logProviderError('recent', err);
    return local.localTrending();
  }
}

export async function getSchedule(day: string): Promise<AnimeSummary[]> {
  try {
    const items = await jikan.schedule(day);
    return items.length ? items : local.localSchedule(day);
  } catch (err) {
    logProviderError('schedule', err);
    return local.localSchedule(day);
  }
}

export async function getWeeklySchedule(): Promise<{
  days: Record<jikan.DayKey, AnimeSummary[]>;
  unknown: AnimeSummary[];
}> {
  try {
    const week = await jikan.weeklySchedule();
    const anyRemote = Object.values(week.days).some((d) => d.length > 0);
    if (anyRemote) return week;
  } catch (err) {
    logProviderError('weekly-schedule', err);
  }
  // Offline fallback: local catalog
  const days = {} as Record<jikan.DayKey, AnimeSummary[]>;
  for (const d of jikan.WEEK_DAYS) days[d] = local.localSchedule(d);
  return {
    days,
    unknown: local
      .localTrending()
      .filter((a) => !a.broadcast),
  };
}

export async function getAnimeGenres(): Promise<GenreInfo[]> {
  try {
    const g = await jikan.genres();
    return g.length ? g : local.localGenres();
  } catch (err) {
    logProviderError('genres', err);
    return local.localGenres();
  }
}

export async function getOfficialTrailers(): Promise<TrailerEntry[]> {
  try {
    const t = await jikan.trailers();
    return t.length ? t : local.localTrailers();
  } catch (err) {
    logProviderError('trailers', err);
    return local.localTrailers();
  }
}

/**
 * Resolve an authorized stream for an episode. Returns null when no
 * licensed source exists — callers then render official viewing links.
 */
export async function getAuthorizedStreamingSources(animeId: string, episodeId: string) {
  const details = await getAnimeDetails(animeId);
  if (!details) return { details: null, episode: null, stream: null };
  const episode = details.episodeList.find((e) => e.id === episodeId || String(e.number) === episodeId) ?? null;
  const stream = episode ? getAuthorizedStreamFor(details, episode) : null;
  return { details, episode, stream };
}

export async function reportBrokenSource(report: BrokenSourceReport): Promise<void> {
  // In production this would enqueue an email/ticket to DMCA_CONTACT_EMAIL.
  // Keep it server-side and free of user secrets.
  const { addReport } = await import('@/lib/reports');
  addReport(report);
  console.info('[report]', JSON.stringify({ ...report, at: new Date().toISOString() }));
}

export { local };
