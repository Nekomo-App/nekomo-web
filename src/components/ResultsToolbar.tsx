'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SORTS = [
  ['popularity', 'Popularity'],
  ['rating', 'Rating'],
  ['release', 'Release date'],
  ['title', 'A–Z'],
  ['updated', 'Recently updated'],
];

const LABELS: Record<string, string> = {
  genre: 'Genre',
  format: 'Format',
  status: 'Status',
  year: 'Year',
  season: 'Season',
  sub: 'Subtitles',
  dub: 'Dub',
  stream: 'Official stream',
  minRating: 'Rating',
};

/** Sort control + removable chips for every active filter — sits above results. */
export function ResultsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const remove = (key: string, value?: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) {
      const rest = (sp.get(key) ?? '').split(',').filter((v) => v && v !== value);
      rest.length ? sp.set(key, rest.join(',')) : sp.delete(key);
    } else {
      sp.delete(key);
    }
    sp.delete('page');
    router.push(`${pathname}?${sp.toString()}`);
  };

  const chips: { key: string; value: string; label: string }[] = [];
  for (const key of ['genre', 'format', 'status']) {
    for (const v of (params.get(key) ?? '').split(',').filter(Boolean)) {
      chips.push({ key, value: v, label: `${LABELS[key]}: ${v}` });
    }
  }
  for (const key of ['year', 'season', 'minRating']) {
    const v = params.get(key);
    if (v) chips.push({ key, value: '', label: `${LABELS[key]}: ${v}${key === 'minRating' ? '+' : ''}` });
  }
  for (const key of ['sub', 'dub', 'stream']) {
    if (params.get(key) === '1') chips.push({ key, value: '', label: LABELS[key] });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
        <AnimatePresence>
          {chips.map((c) => (
            <motion.button
              key={`${c.key}-${c.value}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={() => remove(c.key, c.value || undefined)}
              aria-label={`Remove filter ${c.label}`}
              className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-rose/50 bg-rose/15 px-3 py-1 text-xs font-medium capitalize text-rose-light transition-colors hover:bg-rose/25"
            >
              {c.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs text-ink-muted">
          Sort
        </label>
        <select
          id="sort-select"
          value={params.get('sort') ?? 'popularity'}
          onChange={(e) => {
            const sp = new URLSearchParams(params.toString());
            e.target.value === 'popularity' ? sp.delete('sort') : sp.set('sort', e.target.value);
            sp.delete('page');
            router.push(`${pathname}?${sp.toString()}`);
          }}
          className="min-h-[36px] rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-rose focus:outline-none"
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
