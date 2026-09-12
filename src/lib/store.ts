'use client';

// Client-side persisted state: watchlist, history, playback progress,
// ratings, settings. Lives in localStorage via zustand/persist.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { AnimeSummary } from '@/lib/types';

export interface ThemeSettings {
  mode: 'dark' | 'light' | 'system';
  accent: 'pink' | 'violet' | 'cyan' | 'magenta' | 'blue';
  bg: 'default' | 'deep' | 'amoled';
  card: 'default' | 'flat' | 'glass';
  density: 'comfortable' | 'compact';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  reducedMotion: boolean;
  blur: boolean;
}

export const DEFAULT_THEME: ThemeSettings = {
  mode: 'dark',
  accent: 'pink',
  bg: 'default',
  card: 'default',
  density: 'comfortable',
  fontSize: 'medium',
  animations: true,
  reducedMotion: false,
  blur: true,
};

export interface WatchProgress {
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  position: number;
  duration: number;
  title: string;
  animeTitle: string;
  poster?: string;
  artHue?: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  poster?: string;
  artHue?: number;
  format?: string;
  viewedAt: number;
}

interface NekomoState {
  watchlist: AnimeSummary[];
  history: HistoryEntry[];
  progress: Record<string, WatchProgress>;
  watchedEpisodes: Record<string, number[]>;
  ratings: Record<string, number>;
  recentSearches: string[];
  autoplayNext: boolean;
  reducedMotion: boolean;
  theme: ThemeSettings;
  profile: { name: string; email: string } | null;
  toggleWatchlist: (a: AnimeSummary) => boolean;
  inWatchlist: (id: string) => boolean;
  markViewed: (a: { id: string; title: string; poster?: string; artHue?: number; format?: string }) => void;
  saveProgress: (p: Omit<WatchProgress, 'updatedAt'>) => void;
  clearProgress: (animeId: string, episodeId: string) => void;
  toggleWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  setRating: (animeId: string, score: number) => void;
  addRecentSearch: (q: string) => void;
  setAutoplayNext: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setTheme: (patch: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
  setProfile: (p: { name: string; email: string } | null) => void;
  clearHistory: () => void;
  removeFromWatchlist: (id: string) => void;
}

export const progressKey = (animeId: string, episodeId: string) => `${animeId}::${episodeId}`;

export const useStore = create<NekomoState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      history: [],
      progress: {},
      watchedEpisodes: {},
      ratings: {},
      recentSearches: [],
      autoplayNext: true,
      reducedMotion: false,
      theme: DEFAULT_THEME,
      profile: null,

      toggleWatchlist: (a) => {
        const list = get().watchlist;
        const exists = list.some((x) => x.id === a.id);
        set({ watchlist: exists ? list.filter((x) => x.id !== a.id) : [a, ...list] });
        return !exists;
      },
      inWatchlist: (id) => get().watchlist.some((x) => x.id === id),
      removeFromWatchlist: (id) =>
        set({ watchlist: get().watchlist.filter((x) => x.id !== id) }),

      markViewed: (a) =>
        set({
          history: [
            { ...a, viewedAt: Date.now() },
            ...get().history.filter((h) => h.id !== a.id),
          ].slice(0, 60),
        }),

      saveProgress: (p) =>
        set({
          progress: {
            ...get().progress,
            [progressKey(p.animeId, p.episodeId)]: { ...p, updatedAt: Date.now() },
          },
        }),
      clearProgress: (animeId, episodeId) => {
        const next = { ...get().progress };
        delete next[progressKey(animeId, episodeId)];
        set({ progress: next });
      },

      toggleWatchedEpisode: (animeId, episodeNumber) => {
        const cur = get().watchedEpisodes[animeId] ?? [];
        set({
          watchedEpisodes: {
            ...get().watchedEpisodes,
            [animeId]: cur.includes(episodeNumber)
              ? cur.filter((n) => n !== episodeNumber)
              : [...cur, episodeNumber].sort((a, b) => a - b),
          },
        });
      },

      setRating: (animeId, score) =>
        set({ ratings: { ...get().ratings, [animeId]: score } }),

      addRecentSearch: (q) =>
        set({
          recentSearches: [q, ...get().recentSearches.filter((x) => x !== q)].slice(0, 8),
        }),

      setAutoplayNext: (v) => set({ autoplayNext: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      setTheme: (patch) => {
        const next = { ...get().theme, ...patch };
        set({ theme: next });
        // keep legacy flag in sync for older components
        set({ reducedMotion: next.reducedMotion || !next.animations });
      },
      resetTheme: () => set({ theme: DEFAULT_THEME, reducedMotion: false }),
      setProfile: (p) => set({ profile: p }),
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'nekomo-store' },
  ),
);

/** True after client mount — use to avoid SSR/CSR markup mismatches. */
export function useHydrated(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}
