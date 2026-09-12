import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAnimeDetails } from '@/lib/providers';
import { officialLinksFor } from '@/lib/providers/streaming';
import { formatFormat, formatScore, formatStatus } from '@/lib/utils';
import { AnimeActions } from '@/components/AnimeActions';
import { AnimeGrid } from '@/components/AnimeRow';
import { DubBadge, StatusBadge, StreamBadge, SubBadge } from '@/components/Badges';
import { EpisodeList } from '@/components/EpisodeList';
import { Poster } from '@/components/Poster';
import { Tabs } from '@/components/Tabs';
import { TrackView } from '@/components/TrackView';
import { RatingWidget } from '@/components/RatingWidget';
import { Synopsis } from '@/components/Synopsis';
import { Comments } from '@/components/Comments';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const anime = await getAnimeDetails(params.id);
  return { title: anime ? anime.title : 'Not found' };
}

export default async function AnimePage({ params }: { params: { id: string } }) {
  const anime = await getAnimeDetails(params.id);
  if (!anime) notFound();

  const links = officialLinksFor(anime);

  return (
    <div className="relative">
      <TrackView anime={anime} />

      {/* Banner */}
      <div className="absolute inset-x-0 top-0 h-72 overflow-hidden sm:h-96" aria-hidden="true">
        {anime.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={anime.banner} alt="" className="h-full w-full object-cover object-top opacity-50" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `radial-gradient(100% 120% at 30% 0%, hsl(${(anime.artHue ?? 320)} 50% 25% / 0.8), transparent 70%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
      </div>

      <div className="relative mx-auto max-w-[1560px] px-4 pb-16 pt-40 sm:px-6 sm:pt-52">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Poster column — side-by-side with meta on phones, stacked on desktop */}
          <div className="flex shrink-0 gap-4 md:w-56 md:flex-col">
            <div className="w-32 shrink-0 overflow-hidden rounded-xl border border-line shadow-glow-sm sm:w-44 md:w-full">
              <Poster src={anime.poster} title={anime.title} artHue={anime.artHue} className="aspect-[2/3]" priority />
            </div>
            <dl className="min-w-0 flex-1 space-y-2.5 self-start rounded-xl border border-line bg-card/60 p-4 text-sm backdrop-blur md:mt-5 md:w-full md:flex-none">
              {[
                ['Format', formatFormat(anime.format)],
                ['Status', formatStatus(anime.status)],
                ['Episodes', anime.episodeCount?.toString() ?? '—'],
                ['Duration', anime.durationMin ? `${anime.durationMin} min` : '—'],
                ['Season', anime.season ? `${anime.season} ${anime.year ?? ''}` : anime.year?.toString() ?? '—'],
                ['Age rating', anime.ageRating ?? '—'],
                ['Studio', anime.studios.join(', ') || '—'],
                ['Demographic', anime.demographic ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={anime.status} />
              {anime.hasSub && <SubBadge />}
              {anime.hasDub && <DubBadge />}
              {anime.hasOfficialStream && <StreamBadge />}
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {anime.title}
            </h1>
            {(anime.altTitle || anime.japaneseTitle) && (
              <p className="mt-1 text-sm text-ink-muted">
                {[anime.altTitle, anime.japaneseTitle].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span className="font-semibold text-warn">★ {formatScore(anime.rating)}</span>
              <RatingWidget animeId={anime.id} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {anime.genres.map((g) => (
                <Link
                  key={g}
                  href={`/browse?genre=${encodeURIComponent(g)}`}
                  className="rounded-full border border-line bg-card/60 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-rose hover:text-white"
                >
                  {g}
                </Link>
              ))}
              {anime.themes.map((t) => (
                <span key={t} className="rounded-full bg-rose-dark/20 px-3 py-1 text-xs text-rose-light">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-5">
              <AnimeActions anime={anime} />
            </div>

            <div className="mt-8">
              <Tabs
                tabs={[
                  {
                    id: 'overview',
                    label: 'Overview',
                    content: (
                      <div className="max-w-3xl space-y-6">
                        <Synopsis text={anime.synopsis} />
                        {anime.producers.length > 0 && (
                          <div>
                            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                              Producers
                            </h3>
                            <p className="text-sm">{anime.producers.join(', ')}</p>
                          </div>
                        )}
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            Where to watch legally
                          </h3>
                          <StreamingLinks links={links} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'episodes',
                    label: `Episodes${anime.episodeCount ? ` (${anime.episodeCount})` : ''}`,
                    content: <EpisodeList anime={anime} />,
                  },
                  {
                    id: 'characters',
                    label: 'Characters',
                    content: <CharacterGrid characters={anime.characters} />,
                  },
                  {
                    id: 'related',
                    label: 'Related',
                    content: (
                      <div className="space-y-8">
                        {anime.relations.map((r) => (
                          <div key={r.type}>
                            <h3 className="mb-3 text-sm font-semibold text-ink-muted">{r.type}</h3>
                            <AnimeGrid items={r.anime} />
                          </div>
                        ))}
                        {anime.recommendations.length > 0 && (
                          <div>
                            <h3 className="mb-3 text-sm font-semibold text-ink-muted">Recommendations</h3>
                            <AnimeGrid items={anime.recommendations} />
                          </div>
                        )}
                        {!anime.relations.length && !anime.recommendations.length && (
                          <p className="text-sm text-ink-muted">No related titles available.</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    id: 'reviews',
                    label: 'Reviews',
                    content: (
                      <div className="max-w-xl space-y-4">
                        <div className="rounded-xl border border-line bg-card/60 p-5">
                          <p className="text-sm text-ink-muted">Community score</p>
                          <p className="mt-1 font-display text-4xl font-extrabold text-white">
                            {formatScore(anime.rating)}
                            <span className="text-base text-ink-muted"> / 10</span>
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-card/60 p-5">
                          <p className="mb-2 text-sm font-semibold">Your rating</p>
                          <RatingWidget animeId={anime.id} large />
                        </div>
                        <p className="text-xs text-ink-muted">
                          Community ratings are stored on this device.
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: 'comments',
                    label: 'Comments',
                    content: <Comments animeId={anime.id} />,
                  },
                  {
                    id: 'streaming',
                    label: 'Streaming',
                    content: (
                      <div className="max-w-xl">
                        <p className="mb-4 text-sm text-ink-muted">
                          Nekomo only links to authorized platforms. We never mirror or proxy
                          unauthorized streams.
                        </p>
                        <StreamingLinks links={links} />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreamingLinks({ links }: { links: { platform: string; url: string; note?: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.platform + l.url}>
          <a
            href={l.url}
            target={l.url.startsWith('http') ? '_blank' : undefined}
            rel={l.url.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="flex items-center justify-between rounded-xl border border-line bg-card/60 px-4 py-3 transition-all hover:border-rose hover:shadow-glow-sm"
          >
            <span className="text-sm font-medium">{l.platform}</span>
            <span className="text-xs text-ink-muted">{l.note ?? 'Official'} ↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

import type { Character } from '@/lib/types';

function CharacterGrid({ characters }: { characters: Character[] }) {
  if (!characters.length)
    return <p className="text-sm text-ink-muted">Character data not available.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-card/60 p-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line">
            <Poster src={c.image} title={c.name} className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="text-xs text-ink-muted">{c.role}</p>
            {c.voiceActor && (
              <p className="truncate text-xs text-ink-muted">
                VA: {c.voiceActor.name} ({c.voiceActor.language})
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
