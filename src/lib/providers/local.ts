// Bundled fallback catalog — used when the remote metadata provider is
// unreachable, and home of "Nekomo Originals": demo titles whose episodes
// stream Creative Commons–licensed films (© Blender Foundation, CC-BY),
// which Nekomo is explicitly permitted to embed.

import type {
  AnimeDetails,
  AnimeFormat,
  AnimeStatus,
  AuthorizedStream,
  Character,
  Episode,
  GenreInfo,
  SearchParams,
  SearchResult,
  SeasonName,
  StreamingLink,
  TrailerEntry,
} from '@/lib/types';
import { currentSeason } from '@/lib/utils';

const CC = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

const CC_VIDEOS = [
  { url: `${CC}/BigBuckBunny.mp4`, note: 'Big Buck Bunny © Blender Foundation — CC-BY 3.0' },
  { url: `${CC}/Sintel.mp4`, note: 'Sintel © Blender Foundation — CC-BY 3.0' },
  { url: `${CC}/TearsOfSteel.mp4`, note: 'Tears of Steel © Blender Foundation — CC-BY 3.0' },
  { url: `${CC}/ElephantsDream.mp4`, note: 'Elephants Dream © Blender Foundation — CC-BY 3.0' },
];

function ccStream(index: number): AuthorizedStream {
  const v = CC_VIDEOS[index % CC_VIDEOS.length];
  return {
    provider: 'Nekomo Originals',
    kind: 'mp4',
    url: v.url,
    subtitles: [{ lang: 'en', label: 'English', url: '/subtitles/originals-en.vtt' }],
    audioLanguages: ['Japanese'],
    licensed: true,
    licenseNote: v.note,
  };
}

function episodes(count: number, streamable: boolean, dur = 24): Episode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ep-${i + 1}`,
    number: i + 1,
    title: `Episode ${i + 1}`,
    durationMin: dur,
    intro: streamable && i === 0 ? { start: 2, end: 12 } : undefined,
    stream: streamable ? ccStream(i) : null,
  }));
}

interface LocalSeed {
  id: string;
  title: string;
  altTitle?: string;
  japaneseTitle?: string;
  synopsis: string;
  year: number;
  season?: SeasonName;
  format: AnimeFormat;
  status: AnimeStatus;
  rating: number;
  episodeCount: number;
  airedEpisodes?: number;
  genres: string[];
  themes?: string[];
  demographic?: string;
  studios: string[];
  producers?: string[];
  durationMin?: number;
  ageRating?: AnimeDetails['ageRating'];
  artHue: number;
  hasDub?: boolean;
  original?: boolean;
  trailerYoutubeId?: string;
  characters: [string, 'Main' | 'Supporting', string?][];
  streamingLinks?: StreamingLink[];
  popularity: number;
  broadcast?: string;
}

const SEEDS: LocalSeed[] = [
  {
    id: 'loc-starlight-strays',
    title: 'Starlight Strays',
    japaneseTitle: '星屑ストレイズ',
    synopsis:
      'When a falling star crashes into her small seaside town, amateur astronomer Mina discovers the "star" is actually a cat-shaped starship — and its pilot needs her help mapping the constellations home before the Star Council arrives to shut the project down.',
    year: 2026,
    season: 'fall',
    format: 'TV',
    status: 'AIRING',
    rating: 8.4,
    episodeCount: 12,
    airedEpisodes: 8,
    genres: ['Adventure', 'Sci-Fi', 'Slice of Life'],
    themes: ['Space', 'Pets'],
    studios: ['Nekomo Pictures'],
    producers: ['Nekomo Originals'],
    durationMin: 24,
    ageRating: 'PG-13',
    artHue: 315,
    hasDub: true,
    original: true,
    trailerYoutubeId: 'YE7VzlLtp-4',
    characters: [
      ['Mina Hoshino', 'Main', 'Aoi Tsukasa'],
      ['Captain Nya-7', 'Main', 'Kenji Hoshizora'],
      ['Director Umbra', 'Supporting', 'Rin Kagawa'],
      ['Tobio', 'Supporting', 'Mei Arashi'],
    ],
    popularity: 95000,
    broadcast: 'Saturdays at 23:30 (JST)',
  },
  {
    id: 'loc-midnight-ramen',
    title: 'Midnight Ramen Club',
    japaneseTitle: '真夜中ラーメン部',
    synopsis:
      'A late-night ramen shop that only appears to heartbroken strangers becomes the battleground for a shy cook and the food critic determined to expose its secrets — one bowl at a time.',
    year: 2026,
    season: 'summer',
    format: 'TV',
    status: 'AIRING',
    rating: 8.1,
    episodeCount: 13,
    airedEpisodes: 10,
    genres: ['Slice of Life', 'Comedy', 'Drama'],
    themes: ['Food', 'Workplace'],
    studios: ['Studio Yozora'],
    durationMin: 23,
    ageRating: 'PG-13',
    artHue: 340,
    original: true,
    trailerYoutubeId: 'eRsGyueVLvQ',
    characters: [
      ['Kana Uehara', 'Main', 'Yui Sakamoto'],
      ['Jiro "the Fork" Manda', 'Main', 'Daiki Ono'],
      ['Granny Ume', 'Supporting', 'Fumie Kato'],
    ],
    popularity: 72000,
    broadcast: 'Fridays at 25:05 (JST)',
  },
  {
    id: 'loc-clockwork-hanami',
    title: 'Clockwork Hanami',
    japaneseTitle: '機械仕掛けの花見',
    synopsis:
      'In a steampunk Kyoto where cherry blossoms bloom through clockwork trees, apprentice engineer Suzu races to repair the Great Blossom Engine before the spring festival — and discovers the machine is powered by a forgotten promise.',
    year: 2025,
    season: 'spring',
    format: 'TV',
    status: 'COMPLETED',
    rating: 8.8,
    episodeCount: 24,
    genres: ['Fantasy', 'Adventure', 'Drama'],
    themes: ['Steampunk', 'Historical'],
    studios: ['Gear & Petal Works'],
    durationMin: 24,
    ageRating: 'PG-13',
    artHue: 300,
    hasDub: true,
    original: true,
    trailerYoutubeId: 'R6MlUcmOul8',
    characters: [
      ['Suzu Karakuri', 'Main', 'Hana Ishida'],
      ['Master Gennai', 'Main', 'Takeshi Mori'],
      ['The Blossom Keeper', 'Supporting', 'N/A'],
    ],
    popularity: 120000,
  },
  {
    id: 'loc-paper-moon-detectives',
    title: 'Paper Moon Detectives',
    synopsis:
      'Two rival student detectives share one umbrella, one office, and zero patience for each other as they solve cases the police file under "too weird."',
    year: 2025,
    season: 'winter',
    format: 'TV',
    status: 'COMPLETED',
    rating: 7.9,
    episodeCount: 12,
    genres: ['Mystery', 'Comedy', 'Romance'],
    themes: ['Detective', 'School'],
    studios: ['Lamp Post Animation'],
    durationMin: 24,
    ageRating: 'PG-13',
    artHue: 265,
    characters: [
      ['Rei Tachibana', 'Main', 'Sora Amamiya'],
      ['Hodaka Yui', 'Main', 'Natsuki Hanae'],
    ],
    popularity: 61000,
  },
  {
    id: 'loc-ash-and-ink',
    title: 'Ash & Ink',
    japaneseTitle: '灰と墨',
    synopsis:
      'A calligrapher who can erase memories with her brush is hired to wipe a soldier’s past — but every stroke she removes brings her own buried history closer to the surface.',
    year: 2024,
    season: 'fall',
    format: 'TV',
    status: 'COMPLETED',
    rating: 8.6,
    episodeCount: 13,
    genres: ['Drama', 'Supernatural', 'Mystery'],
    themes: ['Memory', 'Military'],
    studios: ['Sumi-e Films'],
    durationMin: 24,
    ageRating: 'R',
    artHue: 280,
    characters: [['Ink / Sumire', 'Main', 'Miyuki Sawashiro']],
    popularity: 88000,
  },
  {
    id: 'loc-tidal-kings',
    title: 'Tidal Kings',
    synopsis:
      'Street surfer Kai inherits his estranged father’s board — and a rivalry with the masked champion who rules the reef break at dawn.',
    year: 2025,
    season: 'summer',
    format: 'TV',
    status: 'COMPLETED',
    rating: 7.6,
    episodeCount: 12,
    genres: ['Sports', 'Drama'],
    themes: ['Surfing'],
    studios: ['Breaker House'],
    durationMin: 23,
    ageRating: 'PG-13',
    artHue: 200,
    characters: [['Kai Arashi', 'Main', 'Kaito Ishikawa']],
    popularity: 54000,
  },
  {
    id: 'loc-the-foxlight-inn',
    title: 'The Foxlight Inn',
    japaneseTitle: '狐灯の宿',
    synopsis:
      'Every traveler who stays at the mountain inn leaves a story behind; the kitsune innkeeper collects them — until one guest arrives carrying a story that isn’t hers to give.',
    year: 2026,
    season: 'winter',
    format: 'TV',
    status: 'UPCOMING',
    rating: 0,
    episodeCount: 12,
    airedEpisodes: 0,
    genres: ['Fantasy', 'Slice of Life', 'Supernatural'],
    themes: ['Mythology'],
    studios: ['Studio Yozora'],
    durationMin: 24,
    ageRating: 'PG',
    artHue: 25,
    characters: [['Yae the Innkeeper', 'Main', 'Aoi Yuuki']],
    popularity: 41000,
  },
  {
    id: 'loc-ghost-frequency',
    title: 'Ghost Frequency',
    synopsis:
      'A pirate radio DJ starts receiving song requests from listeners who died decades ago — and one voice keeps requesting a song that was never released.',
    year: 2025,
    season: 'fall',
    format: 'TV',
    status: 'COMPLETED',
    rating: 8.2,
    episodeCount: 12,
    genres: ['Horror', 'Mystery', 'Supernatural'],
    themes: ['Music', 'Radio'],
    studios: ['Static Room'],
    durationMin: 24,
    ageRating: 'R',
    artHue: 190,
    characters: [['DJ Nox / Ren Otonashi', 'Main', 'Mamoru Miyano']],
    popularity: 77000,
  },
  {
    id: 'loc-cathedral-of-rust',
    title: 'Cathedral of Rust',
    synopsis:
      'Centuries after the machines stopped, a pilgrimage of children follows the last working lighthouse across a continent of scrap.',
    year: 2024,
    season: 'spring',
    format: 'MOVIE',
    status: 'COMPLETED',
    rating: 8.9,
    episodeCount: 1,
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    themes: ['Post-Apocalyptic'],
    studios: ['Gear & Petal Works'],
    durationMin: 118,
    ageRating: 'PG-13',
    artHue: 15,
    hasDub: true,
    characters: [['Io', 'Main', 'Rina Satō']],
    popularity: 102000,
  },
  {
    id: 'loc-bento-battlers',
    title: 'Bento Battlers!',
    synopsis:
      'Lunchtime is war: elementary school chefs duel with themed lunchboxes judged by the terrifyingly impartial Lunch Lady League.',
    year: 2026,
    season: 'spring',
    format: 'TV',
    status: 'AIRING',
    rating: 7.2,
    episodeCount: 24,
    airedEpisodes: 20,
    genres: ['Comedy', 'Gourmet'],
    themes: ['Food', 'School'],
    studios: ['Lamp Post Animation'],
    durationMin: 12,
    ageRating: 'G',
    artHue: 45,
    hasDub: true,
    characters: [['Tamago Tanaka', 'Main', 'Ikue Ōtani']],
    popularity: 38000,
    broadcast: 'Weekdays at 7:30 (JST)',
  },
  {
    id: 'loc-silverline-express',
    title: 'Silverline Express',
    japaneseTitle: '銀線急行',
    synopsis:
      'A night train that crosses between the living world and the next hires its first human conductor in a hundred years.',
    year: 2025,
    season: 'winter',
    format: 'MOVIE',
    status: 'COMPLETED',
    rating: 8.5,
    episodeCount: 1,
    genres: ['Fantasy', 'Drama'],
    themes: ['Trains', 'Afterlife'],
    studios: ['Sumi-e Films'],
    durationMin: 104,
    ageRating: 'PG',
    artHue: 230,
    characters: [['Conductor Hoshi', 'Main', 'Kenjirō Tsuda']],
    popularity: 69000,
  },
  {
    id: 'loc-mecha-marmalade',
    title: 'Mecha Marmalade',
    synopsis:
      'The world’s most advanced combat mech is powered by citrus preserves, and its pilot is a grandmother who refuses to read the manual.',
    year: 2026,
    season: 'summer',
    format: 'ONA',
    status: 'AIRING',
    rating: 7.8,
    episodeCount: 10,
    airedEpisodes: 6,
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    themes: ['Mecha'],
    studios: ['Static Room'],
    durationMin: 15,
    ageRating: 'PG-13',
    artHue: 35,
    characters: [['Granny Marmalade', 'Main', 'Masako Nozawa']],
    popularity: 47000,
  },
  {
    id: 'loc-the-silent-diviner',
    title: 'The Silent Diviner',
    synopsis:
      'A court fortune-teller cursed to speak only truths is assigned to a prince who has never told one.',
    year: 2024,
    season: 'summer',
    format: 'TV',
    status: 'COMPLETED',
    rating: 8.0,
    episodeCount: 13,
    genres: ['Drama', 'Fantasy', 'Romance'],
    themes: ['Royalty'],
    studios: ['Breaker House'],
    durationMin: 24,
    ageRating: 'PG-13',
    artHue: 320,
    characters: [['The Diviner', 'Main', 'Saori Hayami']],
    popularity: 83000,
  },
  {
    id: 'loc-hollow-petal',
    title: 'Hollow Petal',
    synopsis:
      'An OVA side story to Clockwork Hanami following the Blossom Keeper’s first — and last — festival.',
    year: 2026,
    format: 'OVA',
    status: 'UPCOMING',
    rating: 0,
    episodeCount: 2,
    airedEpisodes: 0,
    genres: ['Fantasy', 'Drama'],
    themes: ['Steampunk'],
    studios: ['Gear & Petal Works'],
    durationMin: 28,
    ageRating: 'PG-13',
    artHue: 305,
    characters: [['The Blossom Keeper', 'Main', 'N/A']],
    popularity: 15000,
  },
  {
    id: 'loc-neon-koi',
    title: 'Neon Koi',
    japaneseTitle: '霓虹鯉',
    synopsis:
      'A graffiti artist’s koi murals swim off the walls at night, and a jaded city inspector must decide whether to paint over the only magic the district has left.',
    year: 2025,
    season: 'fall',
    format: 'SPECIAL',
    status: 'COMPLETED',
    rating: 7.7,
    episodeCount: 1,
    genres: ['Fantasy', 'Slice of Life'],
    themes: ['Urban', 'Art'],
    studios: ['Lamp Post Animation'],
    durationMin: 45,
    ageRating: 'PG',
    artHue: 290,
    characters: [['Inspector Aoki', 'Main', 'Hiroshi Kamiya']],
    popularity: 29000,
  },
  {
    id: 'loc-wolves-of-kitsune-bank',
    title: 'Wolves of Kitsune Bank',
    synopsis:
      'A disgraced hedge fund analyst joins a rural credit union run entirely by fox spirits and learns what "compound interest" means when time works differently.',
    year: 2026,
    season: 'fall',
    format: 'TV',
    status: 'AIRING',
    rating: 7.4,
    episodeCount: 12,
    airedEpisodes: 5,
    genres: ['Comedy', 'Fantasy', 'Slice of Life'],
    themes: ['Economics', 'Mythology'],
    studios: ['Studio Yozora'],
    durationMin: 24,
    ageRating: 'PG-13',
    artHue: 140,
    characters: [['Shun Kurosawa', 'Main', 'Yūichi Nakamura']],
    popularity: 33000,
    broadcast: 'Thursdays at 24:00 (JST)',
  },
];

function buildDetails(seed: LocalSeed): AnimeDetails {
  const links: StreamingLink[] =
    seed.streamingLinks ??
    (seed.original
      ? [
          { platform: 'Nekomo Originals', url: `/anime/${seed.id}`, type: 'both', note: 'Stream free on Nekomo' },
        ]
      : [
          {
            platform: 'Crunchyroll',
            url: `https://www.crunchyroll.com/search?q=${encodeURIComponent(seed.title)}`,
            type: 'both',
            note: 'Search official catalog',
          },
          {
            platform: 'HIDIVE',
            url: `https://www.hidive.com/search?q=${encodeURIComponent(seed.title)}`,
            type: 'both',
            note: 'Search official catalog',
          },
        ]);

  const characters: Character[] = seed.characters.map(([name, role, va], i) => ({
    id: `${seed.id}-c${i}`,
    name,
    role,
    voiceActor: va && va !== 'N/A' ? { name: va, language: 'Japanese' } : undefined,
  }));

  const others = SEEDS.filter((s) => s.id !== seed.id);
  const sameGenre = others
    .filter((s) => s.genres.some((g) => seed.genres.includes(g)))
    .slice(0, 8);

  return {
    id: seed.id,
    provider: 'local',
    title: seed.title,
    altTitle: seed.altTitle,
    japaneseTitle: seed.japaneseTitle,
    synopsis: seed.synopsis,
    year: seed.year,
    season: seed.season,
    format: seed.format,
    status: seed.status,
    rating: seed.rating || undefined,
    episodeCount: seed.episodeCount,
    airedEpisodes: seed.airedEpisodes ?? (seed.status === 'COMPLETED' ? seed.episodeCount : 0),
    genres: seed.genres,
    themes: seed.themes ?? [],
    demographic: seed.demographic,
    studios: seed.studios,
    producers: seed.producers ?? seed.studios,
    durationMin: seed.durationMin ?? 24,
    ageRating: seed.ageRating,
    artHue: seed.artHue,
    hasSub: true,
    hasDub: seed.hasDub ?? false,
    hasOfficialStream: true,
    popularity: seed.popularity,
    updatedAt: new Date().toISOString(),
    broadcast: seed.broadcast,
    trailerYoutubeId: seed.trailerYoutubeId,
    streamingLinks: links,
    characters,
    recommendations: sameGenre.map(toSummary),
    relations:
      seed.id === 'loc-hollow-petal'
        ? [{ type: 'Prequel', anime: [toSummary(SEEDS.find((s) => s.id === 'loc-clockwork-hanami')!)] }]
        : seed.id === 'loc-clockwork-hanami'
          ? [{ type: 'Side story', anime: [toSummary(SEEDS.find((s) => s.id === 'loc-hollow-petal')!)] }]
          : [],
    episodeList: episodes(seed.episodeCount, seed.original === true, seed.durationMin),
  };
}

function toSummary(seed: LocalSeed) {
  return buildSummary(seed);
}

function buildSummary(seed: LocalSeed) {
  return {
    id: seed.id,
    provider: 'local' as const,
    title: seed.title,
    altTitle: seed.altTitle,
    japaneseTitle: seed.japaneseTitle,
    synopsis: seed.synopsis,
    year: seed.year,
    format: seed.format,
    status: seed.status,
    rating: seed.rating || undefined,
    episodeCount: seed.episodeCount,
    airedEpisodes: seed.airedEpisodes ?? (seed.status === 'COMPLETED' ? seed.episodeCount : 0),
    genres: seed.genres,
    hasSub: true,
    hasDub: seed.hasDub ?? false,
    hasOfficialStream: true,
    popularity: seed.popularity,
    updatedAt: new Date().toISOString(),
    artHue: seed.artHue,
    broadcast: seed.broadcast,
  };
}

export function allLocal(): AnimeDetails[] {
  return SEEDS.map(buildDetails);
}

export function localById(id: string): AnimeDetails | null {
  const seed = SEEDS.find((s) => s.id === id);
  return seed ? buildDetails(seed) : null;
}

export function localSearch(params: SearchParams): SearchResult {
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const q = params.q?.toLowerCase().trim();
  let items = SEEDS.filter((s) => {
    if (q) {
      const hay = [s.title, s.altTitle, s.japaneseTitle, s.synopsis, ...s.studios, ...s.genres, ...s.characters.map((c) => c[0])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (params.genres?.length && !params.genres.some((g) => s.genres.includes(g))) return false;
    if (params.formats?.length && !params.formats.includes(s.format)) return false;
    if (params.statuses?.length && !params.statuses.includes(s.status)) return false;
    if (params.year && s.year !== params.year) return false;
    if (params.season && s.season !== params.season) return false;
    if (params.minRating && (s.rating ?? 0) < params.minRating) return false;
    if (params.hasDub && !s.hasDub) return false;
    return true;
  }).map(buildSummary);

  switch (params.sort) {
    case 'rating':
      items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'release':
    case 'updated':
      items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      break;
    case 'title':
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }

  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    hasMore: start + limit < items.length,
    offline: true,
  };
}

export function localTrending() {
  return SEEDS.slice()
    .sort((a, b) => b.popularity - a.popularity)
    .map(buildSummary);
}

export function localSeasonal(season?: SeasonName, year?: number) {
  const cur = currentSeason();
  const s = season ?? cur.season;
  const y = year ?? cur.year;
  return SEEDS.filter((x) => x.season === s && x.year === y).map(buildSummary);
}

export function localGenres(): GenreInfo[] {
  const counts = new Map<string, number>();
  for (const s of SEEDS) for (const g of s.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export function localTrailers(): TrailerEntry[] {
  return SEEDS.filter((s) => s.trailerYoutubeId).map((s) => ({
    animeId: s.id,
    title: s.title,
    youtubeId: s.trailerYoutubeId!,
  }));
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export function localSchedule(day: string) {
  const d = day.toLowerCase().replace(/s$/, '');
  return SEEDS.filter((s) => {
    const b = s.broadcast?.toLowerCase() ?? '';
    if (!b) return false;
    if (b.includes(d)) return true;
    if (b.includes('weekday') && WEEKDAYS.includes(d)) return true;
    return false;
  }).map(buildSummary);
}
