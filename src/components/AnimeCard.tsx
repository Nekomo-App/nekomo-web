'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AnimeSummary } from '@/lib/types';
import { useHydrated, useStore } from '@/lib/store';
import { formatFormat, formatStatus } from '@/lib/utils';
import { DubBadge, ScoreBadge, StatusBadge, SubBadge } from './Badges';
import { Poster } from './Poster';
import { QuickViewModal } from './QuickViewModal';
import { toast } from './Toaster';

export function AnimeCard({ anime, index = 0 }: { anime: AnimeSummary; index?: number }) {
  const router = useRouter();
  const [quickView, setQuickView] = useState(false);
  const hydrated = useHydrated();
  const inList = useStore((s) => s.watchlist.some((x) => x.id === anime.id));
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const watchedEps = useStore((s) => s.watchedEpisodes[anime.id] ?? []);

  const progress =
    hydrated && anime.episodeCount ? Math.min(watchedEps.length / anime.episodeCount, 1) : 0;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '40px' }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
        className="group relative"
      >
        <Link
          href={`/anime/${anime.id}`}
          className="block"
          aria-label={`View details for ${anime.title}`}
        >
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-card transition-all duration-300 ease-out-soft group-hover:scale-[1.03] group-hover:border-rose/60 group-hover:shadow-glow">
            <Poster
              src={anime.poster}
              title={anime.title}
              artHue={anime.artHue}
              className="absolute inset-0"
            />
            {/* top badges */}
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              <StatusBadge status={anime.status} />
            </div>
            <div className="absolute right-2 top-2 flex gap-1">
              {anime.hasSub && <SubBadge />}
              {anime.hasDub && <DubBadge />}
            </div>
            <div className="absolute left-2 bottom-2">
              <ScoreBadge score={anime.rating} />
            </div>
            {/* watch progress */}
            {hydrated && progress > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                <div
                  className="h-full bg-rose transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
            {/* hover overlay */}
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="w-full rounded-lg bg-rose py-1.5 text-center text-xs font-semibold text-white">
                View Details
              </span>
            </div>
          </div>
        </Link>

        {/* action buttons — visible on hover/focus, always visible on touch */}
        <div className="touch-visible absolute right-2 top-8 flex flex-col gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.preventDefault();
              const added = toggleWatchlist(anime);
              toast(added ? `Added “${anime.title}” to watchlist` : 'Removed from watchlist', 'success');
            }}
            aria-label={inList ? `Remove ${anime.title} from watchlist` : `Add ${anime.title} to watchlist`}
            aria-pressed={hydrated && inList}
            className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-colors [@media(hover:none)]:h-11 [@media(hover:none)]:w-11 ${
              hydrated && inList
                ? 'border-rose bg-rose/80 text-white'
                : 'border-line bg-black/50 text-ink-muted hover:border-rose hover:text-rose-light'
            }`}
          >
            <motion.svg
              width="14" height="14" viewBox="0 0 24 24"
              fill={hydrated && inList ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2"
              animate={hydrated && inList ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <path d="M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z" strokeLinejoin="round" />
            </motion.svg>
          </motion.button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setQuickView(true);
            }}
            aria-label={`Quick view ${anime.title}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-black/50 text-ink-muted backdrop-blur transition-colors hover:border-rose hover:text-rose-light [@media(hover:none)]:h-11 [@media(hover:none)]:w-11"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        <div className="mt-2 space-y-0.5 px-0.5">
          <h3 className="clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-rose-light">
            {anime.title}
          </h3>
          <p className="text-xs text-ink-muted">
            {anime.year ?? '—'} · {formatFormat(anime.format)} · {formatStatus(anime.status)}
            {anime.airedEpisodes != null && anime.episodeCount
              ? ` · EP ${anime.airedEpisodes}/${anime.episodeCount}`
              : anime.episodeCount
                ? ` · ${anime.episodeCount} ep`
                : ''}
          </p>
        </div>
      </motion.article>

      <QuickViewModal anime={anime} open={quickView} onClose={() => setQuickView(false)} />
    </>
  );
}
