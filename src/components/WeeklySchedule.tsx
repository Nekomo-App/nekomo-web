'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import type { AnimeSummary } from '@/lib/types';
import { cn, formatStatus } from '@/lib/utils';
import { Poster } from './Poster';
import { AnimeGrid } from './AnimeRow';
import { EmptyState } from './States';

export const DAY_KEYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
type DayKey = (typeof DAY_KEYS)[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

function todayKey(): DayKey {
  return DAY_KEYS[(new Date().getDay() + 6) % 7];
}

export function WeeklySchedule({
  week,
  initialDay,
}: {
  week: { days: Record<DayKey, AnimeSummary[]>; unknown: AnimeSummary[] };
  initialDay?: string;
}) {
  const today = todayKey();
  const valid = DAY_KEYS.includes(initialDay as DayKey) ? (initialDay as DayKey) : today;
  const [day, setDay] = useState<DayKey>(valid);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const empty = !DAY_KEYS.some((d) => week.days[d].length) && !week.unknown.length;

  if (empty) {
    return (
      <EmptyState
        title="Schedule unavailable"
        message="No broadcasts found — the provider may be unreachable."
        actionLabel="Browse instead"
        actionHref="/browse"
      />
    );
  }

  return (
    <div>
      {/* Day selector — swipeable chips, used for list view & all mobile */}
      <div
        role="tablist"
        aria-label="Day of week"
        className={cn(
          'no-scrollbar -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1',
          view === 'calendar' && 'lg:hidden',
        )}
      >
        {DAY_KEYS.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full px-5 py-2 text-sm font-medium capitalize transition-all',
              d === day
                ? 'bg-rose text-white shadow-glow-sm'
                : 'border border-line text-ink-muted hover:border-rose hover:text-white',
              d === today && d !== day && 'border-dashed',
            )}
          >
            {DAY_LABELS[d].slice(0, 3)}
            {d === today && <span className="sr-only"> (today)</span>}
          </button>
        ))}
      </div>

      {/* View toggle — desktop only */}
      <div className="mb-6 hidden justify-end gap-1 lg:flex">
        {(['calendar', 'list'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
              view === v ? 'bg-rose/20 text-rose-light' : 'text-ink-muted hover:text-white',
            )}
          >
            {v === 'calendar' ? 'Weekly calendar' : 'List view'}
          </button>
        ))}
      </div>

      {/* Calendar: 7 columns on large screens */}
      <div
        className={cn(
          'no-scrollbar gap-3 overflow-x-auto pb-2',
          view === 'calendar' ? 'hidden lg:grid lg:grid-cols-7' : 'hidden',
        )}
      >
        {DAY_KEYS.map((d) => (
          <div key={d} className="min-w-[170px]">
            <div
              className={cn(
                'mb-2 rounded-lg border px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider',
                d === today ? 'border-rose bg-rose/15 text-rose-light' : 'border-line text-ink-muted',
              )}
            >
              {DAY_LABELS[d]}
              {d === today && ' · today'}
            </div>
            <div className="space-y-2">
              {week.days[d].length ? (
                week.days[d].map((a) => <MiniCard key={a.id} anime={a} />)
              ) : (
                <p className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-ink-muted/60">
                  —
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* List view: selected day grid */}
      <div className={cn(view === 'calendar' && 'lg:hidden')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {week.days[day].length ? (
              <AnimeGrid items={week.days[day]} />
            ) : (
              <EmptyState
                title={`Nothing scheduled on ${DAY_LABELS[day]}`}
                message="No broadcasts found for this day."
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {week.unknown.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold">Unscheduled / TBA</h2>
          <AnimeGrid items={week.unknown} />
        </div>
      )}

      <p className="mt-6 text-xs text-ink-muted">
        Broadcast times are shown in Japan Standard Time (JST) as reported by the metadata provider.
      </p>
    </div>
  );
}

function MiniCard({ anime }: { anime: AnimeSummary }) {
  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex gap-2.5 rounded-xl border border-line bg-card/60 p-2 transition-all hover:border-rose/60 hover:shadow-glow-sm"
    >
      <div className="w-10 shrink-0 overflow-hidden rounded-md">
        <Poster src={anime.poster} title={anime.title} artHue={anime.artHue} className="aspect-[2/3]" />
      </div>
      <div className="min-w-0">
        <p className="clamp-2 text-xs font-medium leading-snug group-hover:text-rose-light">
          {anime.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">
          {anime.broadcast ?? formatStatus(anime.status)}
        </p>
      </div>
    </Link>
  );
}
