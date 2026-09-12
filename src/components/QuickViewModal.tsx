'use client';

import Link from 'next/link';
import type { AnimeSummary } from '@/lib/types';
import { formatFormat, formatScore, formatStatus } from '@/lib/utils';
import { DubBadge, StreamBadge, SubBadge } from './Badges';
import { Modal } from './Modal';
import { Poster } from './Poster';

export function QuickViewModal({
  anime,
  open,
  onClose,
}: {
  anime: AnimeSummary;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={`Quick view: ${anime.title}`}>
      <div className="flex gap-4 p-5">
        <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-line">
          <Poster src={anime.poster} title={anime.title} artHue={anime.artHue} className="aspect-[2/3]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight">{anime.title}</h3>
          {anime.altTitle && <p className="mt-0.5 text-xs text-ink-muted">{anime.altTitle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span className="font-semibold text-warn">★ {formatScore(anime.rating)}</span>
            <span>· {anime.year ?? '—'}</span>
            <span>· {formatFormat(anime.format)}</span>
            <span>· {formatStatus(anime.status)}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {anime.hasSub && <SubBadge />}
            {anime.hasDub && <DubBadge />}
            {anime.hasOfficialStream && <StreamBadge />}
          </div>
        </div>
      </div>
      <div className="px-5">
        <p className="clamp-3 text-sm leading-relaxed text-ink-muted">{anime.synopsis ?? 'No synopsis available.'}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {anime.genres.slice(0, 5).map((g) => (
            <span key={g} className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">
              {g}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2 p-5">
        <Link
          href={`/anime/${anime.id}`}
          className="flex-1 rounded-lg bg-rose py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
        >
          View Details
        </Link>
        {anime.hasOfficialStream && (
          <Link
            href={`/watch/${anime.id}/ep-1`}
            className="flex-1 rounded-lg border border-line py-2 text-center text-sm font-semibold text-ink transition-colors hover:border-rose"
          >
            Watch
          </Link>
        )}
        <button
          onClick={onClose}
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-white"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
