'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { AnimeSummary } from '@/lib/types';
import { useHydrated, useStore } from '@/lib/store';
import { formatTime } from '@/lib/utils';
import { AnimeCard } from './AnimeCard';
import { AnimeRow, SectionHeader } from './AnimeRow';
import { Poster } from './Poster';

/** "Continue watching" — resume cards built from saved playback progress. */
export function ContinueWatchingRow() {
  const hydrated = useHydrated();
  const progress = useStore((s) => s.progress);
  if (!hydrated) return null;

  const items = Object.values(progress)
    .filter((p) => p.duration && p.position / p.duration < 0.92)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);
  if (!items.length) return null;

  return (
    <section>
      <SectionHeader title="Continue Watching" href="/history" />
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {items.map((p, i) => {
          const pct = Math.min((p.position / p.duration) * 100, 100);
          return (
            <motion.div
              key={`${p.animeId}-${p.episodeId}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.35) }}
              className="w-64 shrink-0 snap-start"
            >
              <Link
                href={`/watch/${p.animeId}/${p.episodeId}`}
                className="group block overflow-hidden rounded-xl border border-line bg-card transition-all hover:border-rose/60 hover:shadow-glow-sm"
              >
                <div className="relative aspect-video">
                  <Poster src={p.poster} title={p.animeTitle} artHue={p.artHue} className="absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-full bg-rose p-3 text-white shadow-glow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                    <div className="h-full bg-rose transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{p.animeTitle}</p>
                  <p className="text-xs text-ink-muted">
                    EP {p.episodeNumber} · {formatTime(p.duration - p.position)} left
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/** "Recently viewed" — details pages the user opened. */
export function RecentlyViewedRow() {
  const hydrated = useHydrated();
  const history = useStore((s) => s.history);
  if (!hydrated || !history.length) return null;

  return (
    <section>
      <SectionHeader title="Recently Viewed" href="/history" />
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {history.slice(0, 12).map((h, i) => (
          <div key={h.id} className="w-40 shrink-0 snap-start sm:w-44">
            <AnimeCard
              anime={
                {
                  id: h.id,
                  provider: 'local',
                  title: h.title,
                  poster: h.poster,
                  artHue: h.artHue,
                  format: (h.format as AnimeSummary['format']) ?? 'TV',
                  status: 'COMPLETED',
                  genres: [],
                  hasSub: false,
                  hasDub: false,
                  hasOfficialStream: false,
                } satisfies AnimeSummary
              }
              index={i}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Watchlist preview" on the homepage. */
export function WatchlistPreviewRow() {
  const hydrated = useHydrated();
  const watchlist = useStore((s) => s.watchlist);
  if (!hydrated || !watchlist.length) return null;
  return <AnimeRow title="From Your Watchlist" href="/watchlist" items={watchlist.slice(0, 12)} />;
}

/** "Recommended for you" — matches watchlist genres against a server-provided pool. */
export function RecommendedRow({ pool }: { pool: AnimeSummary[] }) {
  const hydrated = useHydrated();
  const watchlist = useStore((s) => s.watchlist);
  if (!hydrated) return null;

  const genres = new Set(watchlist.flatMap((a) => a.genres));
  const owned = new Set(watchlist.map((a) => a.id));
  const picks = genres.size
    ? pool.filter((a) => !owned.has(a.id) && a.genres.some((g) => genres.has(g))).slice(0, 12)
    : pool.filter((a) => !owned.has(a.id)).slice(0, 12);
  if (!picks.length) return null;

  return (
    <AnimeRow
      title={genres.size ? 'Recommended For You' : 'You Might Also Like'}
      href="/browse"
      items={picks}
    />
  );
}
