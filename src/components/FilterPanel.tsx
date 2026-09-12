'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { GenreInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

const FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
const STATUSES = [
  ['AIRING', 'Airing'],
  ['COMPLETED', 'Completed'],
  ['UPCOMING', 'Upcoming'],
];
const SORTS = [
  ['popularity', 'Popularity'],
  ['rating', 'Rating'],
  ['release', 'Release date'],
  ['title', 'A–Z'],
  ['updated', 'Recently updated'],
];
const SEASONS = ['winter', 'spring', 'summer', 'fall'];

function toggleInList(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FilterPanel({ genres }: { genres: GenreInfo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const get = (k: string) => params.get(k) ?? '';
  const list = (k: string) => (get(k) ? get(k).split(',') : []);

  const update = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete('page');
    router.push(`${pathname}?${sp.toString()}`);
  };

  const toggleList = (key: string, value: string) =>
    update({ [key]: toggleInList(list(key), value).join(',') || undefined });

  const clearAll = () => {
    const sp = new URLSearchParams();
    if (get('q')) sp.set('q', get('q'));
    router.push(`${pathname}?${sp.toString()}`);
  };

  const activeCount =
    list('format').length +
    list('status').length +
    list('genre').length +
    (get('year') ? 1 : 0) +
    (get('season') ? 1 : 0) +
    (get('sub') ? 1 : 0) +
    (get('dub') ? 1 : 0) +
    (get('stream') ? 1 : 0) +
    (get('minRating') ? 1 : 0);

  const panel = (
    <div className="space-y-6">
      <FilterGroup title="Sort by">
        <select
          value={get('sort') || 'popularity'}
          onChange={(e) => update({ sort: e.target.value === 'popularity' ? undefined : e.target.value })}
          className="w-full rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm text-ink focus:border-rose focus:outline-none"
          aria-label="Sort results"
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup title="Format">
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((f) => (
            <Chip key={f} active={list('format').includes(f)} onClick={() => toggleList('format', f)}>
              {f === 'MOVIE' ? 'Movie' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Status">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(([v, l]) => (
            <Chip key={v} active={list('status').includes(v)} onClick={() => toggleList('status', v)}>
              {l}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Genres">
        <div className="flex flex-wrap gap-1.5">
          {genres.slice(0, 18).map((g) => (
            <Chip
              key={g.name}
              active={list('genre').includes(g.name)}
              onClick={() => toggleList('genre', g.name)}
            >
              {g.name}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Year">
        <select
          value={get('year')}
          onChange={(e) => update({ year: e.target.value || undefined })}
          className="w-full rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm text-ink focus:border-rose focus:outline-none"
          aria-label="Filter by year"
        >
          <option value="">Any year</option>
          {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup title="Season">
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <Chip
              key={s}
              active={get('season') === s}
              onClick={() => update({ season: get('season') === s ? undefined : s })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="space-y-2">
          {[
            ['sub', 'Subtitles available'],
            ['dub', 'Dub available'],
            ['stream', 'Official stream available'],
          ].map(([k, l]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={get(k) === '1'}
                onChange={(e) => update({ [k]: e.target.checked ? '1' : undefined })}
                className="h-4 w-4 rounded border-line bg-bg-alt accent-rose"
              />
              {l}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Minimum rating">
        <select
          value={get('minRating')}
          onChange={(e) => update({ minRating: e.target.value || undefined })}
          className="w-full rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm text-ink focus:border-rose focus:outline-none"
          aria-label="Minimum rating"
        >
          <option value="">Any</option>
          {[6, 7, 8, 9].map((r) => (
            <option key={r} value={r}>
              {r}.0+
            </option>
          ))}
        </select>
      </FilterGroup>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-lg border border-danger/40 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm font-medium lg:hidden"
      >
        <span>
          Filters {activeCount > 0 && <span className="ml-1 rounded-full bg-rose px-2 py-0.5 text-xs text-white">{activeCount}</span>}
        </span>
        <motion.svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          animate={{ rotate: open ? 180 : 0 }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="mb-6 rounded-xl border border-line bg-card p-4">{panel}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 rounded-xl border border-line bg-card p-5">{panel}</div>
      </aside>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200',
        active
          ? 'border-rose bg-rose/20 text-rose-light shadow-glow-sm'
          : 'border-line text-ink-muted hover:border-rose/50 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
