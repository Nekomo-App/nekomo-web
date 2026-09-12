import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthorizedStreamingSources } from '@/lib/providers';
import { officialLinksFor } from '@/lib/providers/streaming';
import { cn } from '@/lib/utils';
import type { StreamingLink } from '@/lib/types';
import { Poster } from '@/components/Poster';
import { StreamingLinks } from '@/components/StreamingLinks';
import { TrackView } from '@/components/TrackView';
import { VideoPlayer } from '@/components/VideoPlayer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { animeId: string; episodeId: string };
}): Promise<Metadata> {
  const { details } = await getAuthorizedStreamingSources(params.animeId, params.episodeId);
  return { title: details ? `Watch ${details.title}` : 'Watch' };
}

export default async function WatchPage({
  params,
}: {
  params: { animeId: string; episodeId: string };
}) {
  const { details, episode, stream } = await getAuthorizedStreamingSources(
    params.animeId,
    params.episodeId,
  );
  if (!details) notFound();

  const current = episode ?? details.episodeList[0] ?? null;
  const idx = current ? details.episodeList.findIndex((e) => e.id === current.id) : -1;
  const prev = idx > 0 ? details.episodeList[idx - 1] : null;
  const next = idx >= 0 && idx < details.episodeList.length - 1 ? details.episodeList[idx + 1] : null;
  const links = officialLinksFor(details);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6">
      <TrackView anime={details} />

      <nav className="mb-4 text-sm text-ink-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-rose-light">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/anime/${details.id}`} className="hover:text-rose-light">{details.title}</Link>
        {current && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink">Episode {current.number}</span>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {current && stream ? (
            <VideoPlayer
              anime={details}
              episode={current}
              stream={stream}
              nextEpisodeId={next?.id}
              fallbackLinks={links}
            />
          ) : (
            <NoStreamPanel
              title={details.title}
              trailerId={details.trailerYoutubeId}
              links={links}
            />
          )}

          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold sm:text-2xl">
                {current ? `E${current.number} — ${current.title}` : details.title}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                <Link href={`/anime/${details.id}`} className="text-rose-light hover:underline">
                  {details.title}
                </Link>
                {current?.synopsis && ` · ${current.synopsis}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={prev ? `/watch/${details.id}/${prev.id}` : '#'}
                aria-disabled={!prev}
                className={cn(
                  'rounded-lg border border-line px-4 py-2 text-sm transition-colors',
                  prev ? 'text-ink hover:border-rose' : 'pointer-events-none text-ink-muted/40',
                )}
              >
                ← Prev
              </Link>
              <Link
                href={next ? `/watch/${details.id}/${next.id}` : '#'}
                aria-disabled={!next}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                  next
                    ? 'border-rose bg-rose/15 text-rose-light hover:bg-rose hover:text-white'
                    : 'pointer-events-none border-line text-ink-muted/40',
                )}
              >
                Next →
              </Link>
            </div>
          </div>
        </div>

        {/* Episode selector */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Episodes
          </h2>
          {details.episodeList.length ? (
            <ol className="max-h-[560px] space-y-1 overflow-y-auto rounded-xl border border-line bg-card/50 p-2">
              {details.episodeList.map((ep) => (
                <li key={ep.id}>
                  <Link
                    href={`/watch/${details.id}/${ep.id}`}
                    aria-current={current?.id === ep.id ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      current?.id === ep.id
                        ? 'bg-rose/20 text-rose-light'
                        : 'text-ink-muted hover:bg-rose/10 hover:text-white',
                    )}
                  >
                    <span className="w-6 shrink-0 font-display font-semibold">{ep.number}</span>
                    <span className="truncate">{ep.title}</span>
                    {ep.stream?.licensed && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-success" title="Official stream" />
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl border border-line bg-card/50 p-4 text-sm text-ink-muted">
              No episode list available.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-line bg-card/50 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Official &amp; free sources
            </h3>
            <StreamingLinks links={links} variant="compact" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function NoStreamPanel({
  title,
  trailerId,
  links,
}: {
  title: string;
  trailerId?: string;
  links: StreamingLink[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      {trailerId ? (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerId}?rel=0`}
            title={`${title} — official trailer`}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-bg-alt">
          <Poster title={title} className="h-40 w-28 rounded-lg" />
        </div>
      )}
      <div className="p-6">
        <h2 className="font-display text-lg font-bold">No playable stream on Nekomo</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
          Nekomo is an open-source project and doesn't host this title. Watch it through one of the
          platforms below — free and licensed options are marked. More sources are listed in the{' '}
          <Link href="/sources" className="text-rose-light hover:underline">source directory</Link>.
        </p>
        <div className="mt-4">
          <StreamingLinks links={links} />
        </div>
      </div>
    </div>
  );
}
