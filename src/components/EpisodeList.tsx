'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import type { AnimeDetails, Episode } from '@/lib/types';
import { progressKey, useHydrated, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from './Toaster';

const PAGE = 24;

export function EpisodeList({ anime }: { anime: AnimeDetails }) {
  const [expanded, setExpanded] = useState(false);
  const hydrated = useHydrated();
  const watched = useStore((s) => s.watchedEpisodes[anime.id] ?? []);
  const toggleWatched = useStore((s) => s.toggleWatchedEpisode);
  const progress = useStore((s) => s.progress);

  const eps = anime.episodeList;
  const visible = expanded ? eps : eps.slice(0, PAGE);

  if (!eps.length) {
    return <p className="text-sm text-ink-muted">Episode list not available for this title yet.</p>;
  }

  return (
    <div>
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        <AnimatePresence initial={false}>
          {visible.map((ep) => {
            const p = hydrated ? progress[progressKey(anime.id, ep.id)] : undefined;
            const pct = p && p.duration ? Math.min((p.position / p.duration) * 100, 100) : 0;
            const isWatched = hydrated && watched.includes(ep.number);
            return (
              <motion.li
                key={ep.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-3 bg-card/60 px-4 py-3 transition-colors hover:bg-card">
                  <span className="w-8 shrink-0 text-center font-display text-sm font-bold text-rose-light">
                    {ep.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', isWatched ? 'text-ink-muted line-through' : 'text-ink')}>
                      {ep.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {ep.airDate ? new Date(ep.airDate).toLocaleDateString() : ''}
                      {ep.durationMin ? ` · ${ep.durationMin} min` : ''}
                      {ep.stream?.licensed ? ' · ' : ''}
                      {ep.stream?.licensed && <span className="text-success">Official stream</span>}
                    </p>
                    {pct > 0 && (
                      <div className="mt-1 h-0.5 w-full max-w-xs rounded-full bg-line">
                        <div className="h-full rounded-full bg-rose transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      toggleWatched(anime.id, ep.number);
                      toast(isWatched ? `Marked episode ${ep.number} unwatched` : `Marked episode ${ep.number} watched`);
                    }}
                    aria-pressed={isWatched}
                    aria-label={isWatched ? `Mark episode ${ep.number} unwatched` : `Mark episode ${ep.number} watched`}
                    className={cn(
                      'shrink-0 rounded-full border p-1.5 transition-colors',
                      isWatched
                        ? 'border-success bg-success/15 text-success'
                        : 'border-line text-ink-muted hover:border-success hover:text-success',
                    )}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <Link
                    href={`/watch/${anime.id}/${ep.id}`}
                    className="shrink-0 rounded-lg bg-rose/15 px-3 py-1.5 text-xs font-semibold text-rose-light transition-colors hover:bg-rose hover:text-white"
                  >
                    {p && pct > 2 && pct < 95 ? 'Resume' : 'Watch'}
                  </Link>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {eps.length > PAGE && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-rose hover:text-white"
        >
          {expanded ? 'Show fewer episodes' : `Show all ${eps.length} episodes`}
        </button>
      )}
    </div>
  );
}
