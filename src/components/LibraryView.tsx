'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AnimeSummary } from '@/lib/types';
import { useStore } from '@/lib/store';
import { cn, formatFormat, formatStatus } from '@/lib/utils';
import { AnimeGrid } from './AnimeRow';
import { Poster } from './Poster';
import { toast } from './Toaster';

/** Grid/list view switcher used by watchlist and history pages. */
export function LibraryView({
  items,
  removable,
}: {
  items: AnimeSummary[];
  removable?: boolean;
}) {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  return (
    <div>
      <div className="mb-4 flex justify-end gap-1" role="group" aria-label="View mode">
        {(['grid', 'list'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            aria-label={`${v} view`}
            className={cn(
              'flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 transition-colors',
              view === v ? 'bg-rose/20 text-rose-light' : 'text-ink-muted hover:text-white',
            )}
          >
            {v === 'grid' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        ))}
      </div>
      {view === 'grid' ? (
        <AnimeGrid items={items} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {items.map((a) => (
            <LibraryRow key={a.id} anime={a} removable={removable} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LibraryRow({ anime, removable }: { anime: AnimeSummary; removable?: boolean }) {
  const remove = useStore((s) => s.removeFromWatchlist);
  const watched = useStore((s) => s.watchedEpisodes[anime.id] ?? []);
  const pct =
    anime.episodeCount != null && anime.episodeCount > 0
      ? Math.min((watched.length / anime.episodeCount) * 100, 100)
      : 0;

  return (
    <li className="flex items-center gap-3 bg-card/60 px-3 py-3 transition-colors hover:bg-card sm:px-4">
      <Link href={`/anime/${anime.id}`} className="w-11 shrink-0 overflow-hidden rounded-md">
        <Poster src={anime.poster} title={anime.title} artHue={anime.artHue} className="aspect-[2/3]" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/anime/${anime.id}`}
          className="block truncate text-sm font-medium hover:text-rose-light"
          title={anime.title}
        >
          {anime.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {anime.year ?? '—'} · {formatFormat(anime.format)} · {formatStatus(anime.status)}
          {anime.episodeCount ? ` · ${anime.episodeCount} ep` : ''}
        </p>
        {pct > 0 && (
          <div className="mt-1.5 h-1 w-full max-w-[200px] rounded-full bg-line">
            <div className="h-full rounded-full bg-rose transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {anime.hasOfficialStream && (
        <Link
          href={`/watch/${anime.id}/ep-1`}
          className="hidden shrink-0 rounded-lg bg-rose/15 px-3 py-2 text-xs font-semibold text-rose-light transition-colors hover:bg-rose hover:text-white sm:block"
        >
          Watch
        </Link>
      )}
      {removable && (
        <button
          onClick={() => {
            remove(anime.id);
            toast(`Removed “${anime.title}”`);
          }}
          aria-label={`Remove ${anime.title} from watchlist`}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-danger"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </li>
  );
}
