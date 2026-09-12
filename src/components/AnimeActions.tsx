'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import type { AnimeDetails } from '@/lib/types';
import { useHydrated, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { toast } from './Toaster';
import { TrailerModal } from './TrailerModal';

export function AnimeActions({ anime }: { anime: AnimeDetails }) {
  const hydrated = useHydrated();
  const inList = useStore((s) => s.watchlist.some((x) => x.id === anime.id));
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const watched = useStore((s) => s.watchedEpisodes[anime.id] ?? []);
  const toggleWatchedEp = useStore((s) => s.toggleWatchedEpisode);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  const allWatched = hydrated && anime.episodeCount != null && watched.length >= anime.episodeCount;
  const firstEp = anime.episodeList[0];

  const markAll = () => {
    const total = anime.episodeCount ?? anime.episodeList.length;
    const target = !allWatched;
    for (let i = 1; i <= total; i++) {
      const has = watched.includes(i);
      if (target && !has) toggleWatchedEp(anime.id, i);
      if (!target && has) toggleWatchedEp(anime.id, i);
    }
    toast(target ? 'Marked all episodes watched' : 'Cleared watched marks', 'success');
  };

  const share = async () => {
    const url = `${window.location.origin}/anime/${anime.id}`;
    try {
      if (navigator.share) await navigator.share({ title: anime.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', 'success');
      }
    } catch {
      /* user cancelled */
    }
  };

  const submitReport = async () => {
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'incorrect-info', animeId: anime.id, message: reportMsg.slice(0, 500) }),
      });
      toast('Report submitted — thank you', 'success');
      setReportOpen(false);
      setReportMsg('');
    } catch {
      toast('Could not submit report', 'error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {firstEp && anime.hasOfficialStream && (
        <Link
          href={`/watch/${anime.id}/${firstEp.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:bg-rose-mid hover:shadow-glow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Watch
        </Link>
      )}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          const added = toggleWatchlist(anime);
          toast(added ? 'Added to watchlist' : 'Removed from watchlist', 'success');
        }}
        aria-pressed={hydrated && inList}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all',
          hydrated && inList
            ? 'border-rose bg-rose/20 text-rose-light'
            : 'border-line text-ink hover:border-rose',
        )}
      >
        <motion.svg
          width="15" height="15" viewBox="0 0 24 24"
          fill={hydrated && inList ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2"
          animate={hydrated && inList ? { scale: [1, 1.35, 1] } : {}}
        >
          <path d="M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z" strokeLinejoin="round" />
        </motion.svg>
        {hydrated && inList ? 'In Watchlist' : 'Add to Watchlist'}
      </motion.button>

      <button
        onClick={markAll}
        className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-success hover:text-success"
      >
        {allWatched ? 'Unmark watched' : 'Mark as watched'}
      </button>

      {anime.trailerYoutubeId && (
        <button
          onClick={() => setTrailerOpen(true)}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-rose"
        >
          ▶ Trailer
        </button>
      )}

      <button
        onClick={share}
        aria-label={`Share ${anime.title}`}
        className="rounded-full border border-line p-2.5 text-ink-muted transition-all hover:border-rose hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
        </svg>
      </button>

      <button
        onClick={() => setReportOpen(true)}
        className="text-xs text-ink-muted underline-offset-2 transition-colors hover:text-danger hover:underline"
      >
        Report incorrect info
      </button>

      <TrailerModal
        youtubeId={anime.trailerYoutubeId}
        title={anime.title}
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
      />

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} label="Report incorrect information">
        <div className="p-5">
          <h3 className="font-display text-lg font-bold">Report incorrect information</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Tell us what&apos;s wrong with the listing for {anime.title}.
          </p>
          <textarea
            value={reportMsg}
            onChange={(e) => setReportMsg(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="e.g. wrong episode count, wrong studio…"
            className="mt-4 w-full rounded-lg border border-line bg-bg-alt p-3 text-sm text-ink placeholder:text-ink-muted/50 focus:border-rose focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setReportOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={submitReport}
              className="rounded-lg bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose-mid"
            >
              Submit report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
