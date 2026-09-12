'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  title: string;
  year?: number;
  format?: string;
}

/** Debounced search input with suggestion dropdown and recent searches. */
export function SearchBar({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const recentSearches = useStore((s) => s.recentSearches);
  const addRecentSearch = useStore((s) => s.addRecentSearch);

  // Keep input in sync when the URL changes externally
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  // Debounced suggestions
  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const commit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    addRecentSearch(v);
    setOpen(false);
    const sp = new URLSearchParams(params.toString());
    sp.set('q', v);
    sp.delete('page');
    router.push(pathname === '/search' || pathname === '/browse' ? `${pathname}?${sp}` : `/search?${sp}`);
  };

  const showRecent = hydrated && open && !q.trim() && recentSearches.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(highlight >= 0 && suggestions[highlight] ? suggestions[highlight].title : q);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, -1));
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoFocus={autoFocus}
          placeholder="Search by title, studio, genre…"
          aria-label="Search anime"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          className="w-full rounded-2xl border border-line bg-card py-3.5 pl-12 pr-4 text-ink placeholder:text-ink-muted/60 transition-all focus:border-rose focus:shadow-glow-sm focus:outline-none"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-rose border-t-transparent" />
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (suggestions.length > 0 || showRecent) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            role="listbox"
            className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-card shadow-glow-sm"
          >
            {showRecent && (
              <div className="p-2">
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Recent searches
                </p>
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    onClick={() => commit(r)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-rose/10 hover:text-white"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="p-2">
                {suggestions.map((s, i) => (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={i === highlight}
                    onClick={() => commit(s.title)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      i === highlight ? 'bg-rose/15 text-white' : 'text-ink hover:bg-rose/10',
                    )}
                  >
                    <span className="truncate">{s.title}</span>
                    <span className="ml-3 shrink-0 text-xs text-ink-muted">
                      {s.year ?? ''} {s.format ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
