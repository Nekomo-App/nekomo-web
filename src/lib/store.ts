'use client';

// Client-side persisted state: watchlist, history, playback progress,
// ratings, settings. Lives in localStorage via zustand/persist.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { AnimeSummary } from '@/lib/types';
import type { Lang } from '@/lib/i18n';

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

export interface Comment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  at: string;
  read: boolean;
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
  profile: { name: string; email?: string; avatar?: string; provider?: 'local' | 'anilist' } | null;
  comments: Record<string, Comment[]>;
  notifications: AppNotification[];
  language: Lang;
  disclaimerAccepted: boolean;
  toggleWatchlist: (a: AnimeSummary) => boolean;
  inWatchlist: (id: string) => boolean;
  markViewed: (a: { id: string; title: string; poster?: string; artHue?: number; format?: string }) => void;
  saveProgress: (p: Omit<WatchProgress, 'updatedAt'>, opts?: { remote?: boolean }) => void;
  clearProgress: (animeId: string, episodeId: string) => void;
  toggleWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  setRating: (animeId: string, score: number) => void;
  addRecentSearch: (q: string) => void;
  setAutoplayNext: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setTheme: (patch: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
  setProfile: (p: { name: string; email?: string; avatar?: string; provider?: 'local' | 'anilist' } | null) => void;
  addComment: (animeId: string, author: string, text: string) => void;
  deleteComment: (animeId: string, id: string) => void;
  notify: (title: string, body?: string) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  setLanguage: (l: Lang) => void;
  acceptDisclaimer: () => void;
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
      comments: {},
      notifications: [],
      language: 'en',
      disclaimerAccepted: false,

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

      saveProgress: (p, opts) => {
        set({
          progress: {
            ...get().progress,
            [progressKey(p.animeId, p.episodeId)]: { ...p, updatedAt: Date.now() },
          },
        });
        // Mirror episode progress to AniList when signed in with it.
        // Skipped for entries the AniList sync itself wrote (opts.remote === false).
        const profile = get().profile;
        if (opts?.remote !== false && profile?.provider === 'anilist' && /^\d+$/.test(p.animeId) && p.episodeNumber > 0) {
          fetch('/api/anilist/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malId: Number(p.animeId), progress: p.episodeNumber }),
          }).catch(() => {});
        }
      },
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
      addComment: (animeId, author, text) =>
        set((s) => ({
          comments: {
            ...s.comments,
            [animeId]: [
              {
                id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                author: author.trim() || 'Anonymous',
                text: text.trim().slice(0, 1000),
                at: new Date().toISOString(),
              },
              ...(s.comments[animeId] ?? []),
            ],
          },
        })),
      deleteComment: (animeId, id) =>
        set((s) => ({
          comments: {
            ...s.comments,
            [animeId]: (s.comments[animeId] ?? []).filter((c) => c.id !== id),
          },
        })),
      notify: (title, body) =>
        set((s) => ({
          notifications: [
            {
              id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              title: title.slice(0, 120),
              body: body?.slice(0, 300),
              at: new Date().toISOString(),
              read: false,
            },
            ...s.notifications,
          ].slice(0, 50),
        })),
      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),
      setLanguage: (l) => set({ language: l }),
      acceptDisclaimer: () => set({ disclaimerAccepted: true }),
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
