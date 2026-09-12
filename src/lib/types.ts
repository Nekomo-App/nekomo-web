// Internal normalized data model shared by all providers.

export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';
export type AnimeStatus = 'AIRING' | 'COMPLETED' | 'UPCOMING';
export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R' | 'R+' | 'Rx';
export type ProviderId = 'jikan' | 'anilist' | 'kitsu' | 'local';
export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall';

export interface StreamingLink {
  platform: string;
  url: string;
  type: 'sub' | 'dub' | 'both';
  note?: string;
  /** Free-with-ads or licensor-uploaded source. */
  free?: boolean;
}

export interface SubtitleTrack {
  lang: string;
  label: string;
  url: string;
}

export interface QualitySource {
  label: string;
  url: string;
}

/**
 * A stream Nekomo owns, licenses, or has explicit permission to embed.
 * Never produced for unauthorized sources — when none exists the UI
 * shows official viewing links instead.
 */
export interface AuthorizedStream {
  provider: string;
  kind: 'mp4' | 'hls';
  url: string;
  qualities?: QualitySource[];
  subtitles?: SubtitleTrack[];
  audioLanguages?: string[];
  licensed: true;
  licenseNote?: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  synopsis?: string;
  durationMin?: number;
  airDate?: string;
  thumbnail?: string;
  /** Verified intro window; only set when data is confirmed. */
  intro?: { start: number; end: number };
  /** Verified outro/credits window. */
  outro?: { start: number; end: number };
  stream?: AuthorizedStream | null;
}

export interface Character {
  id: string;
  name: string;
  role: 'Main' | 'Supporting';
  image?: string;
  voiceActor?: { name: string; language: string; image?: string };
}

export interface AnimeSummary {
  id: string;
  provider: ProviderId;
  title: string;
  altTitle?: string;
  japaneseTitle?: string;
  synopsis?: string;
  year?: number;
  format: AnimeFormat;
  status: AnimeStatus;
  rating?: number;
  episodeCount?: number;
  airedEpisodes?: number;
  poster?: string;
  banner?: string;
  /** Seed used to generate fallback artwork when no poster exists. */
  artHue?: number;
  genres: string[];
  hasSub: boolean;
  hasDub: boolean;
  hasOfficialStream: boolean;
  popularity?: number;
  updatedAt?: string;
  broadcast?: string;
}

export interface AnimeRelation {
  type: string;
  anime: AnimeSummary[];
}

export interface AnimeDetails extends AnimeSummary {
  synopsis: string;
  themes: string[];
  demographic?: string;
  studios: string[];
  producers: string[];
  season?: SeasonName;
  durationMin?: number;
  ageRating?: AgeRating;
  trailerYoutubeId?: string;
  streamingLinks: StreamingLink[];
  characters: Character[];
  recommendations: AnimeSummary[];
  relations: AnimeRelation[];
  episodeList: Episode[];
}

export interface SearchParams {
  q?: string;
  genres?: string[];
  formats?: AnimeFormat[];
  statuses?: AnimeStatus[];
  year?: number;
  season?: SeasonName;
  minRating?: number;
  hasSub?: boolean;
  hasDub?: boolean;
  hasOfficialStream?: boolean;
  sort?: 'popularity' | 'rating' | 'release' | 'title' | 'updated';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: AnimeSummary[];
  total: number;
  page: number;
  hasMore: boolean;
  /** True when results came from the bundled fallback dataset. */
  offline?: boolean;
}

export interface TrailerEntry {
  animeId: string;
  title: string;
  poster?: string;
  youtubeId: string;
}

export interface GenreInfo {
  name: string;
  count?: number;
}

export type ReportKind = 'broken-source' | 'incorrect-info' | 'copyright' | 'contact';

export interface BrokenSourceReport {
  kind: ReportKind;
  animeId?: string;
  episodeId?: string;
  name?: string;
  email?: string;
  message?: string;
}
