'use client';

import { useEffect, useRef } from 'react';
import { progressKey, useHydrated, useStore } from '@/lib/store';
import type { AlListEntry } from '@/app/api/anilist/list/route';

/**
 * One-shot sync: when signed in with AniList, pull the user's
 * current/paused list and merge it into the local progress store so
 * "Continue Watching" shows where they left off — even on a new device.
 */
export function AniListSync() {
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || profile?.provider !== 'anilist' || ran.current) return;
    ran.current = true;

    fetch('/api/anilist/list')
      .then((r) => r.json())
      .then((d: { entries?: AlListEntry[] }) => {
        const { progress, saveProgress } = useStore.getState();
        for (const e of d.entries ?? []) {
          if (!e.malId || e.progress <= 0) continue;
          const animeId = String(e.malId);
          const nextEp = Math.min(e.progress + 1, e.episodes ?? e.progress + 1);
          const key = progressKey(animeId, `ep-${nextEp}`);
          // Don't clobber fresher local progress.
          if (progress[key] && progress[key].episodeNumber >= nextEp) continue;
          saveProgress({
            animeId,
            episodeId: `ep-${nextEp}`,
            episodeNumber: nextEp,
            position: 0,
            duration: 1,
            title: `Episode ${nextEp}`,
            animeTitle: e.title,
            poster: e.poster,
          }, { remote: false });
        }
      })
      .catch(() => {});
  }, [hydrated, profile]);

  return null;
}
