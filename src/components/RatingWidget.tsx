'use client';

import { motion } from 'framer-motion';
import { useHydrated, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from './Toaster';

export function RatingWidget({ animeId, large }: { animeId: string; large?: boolean }) {
  const hydrated = useHydrated();
  const rating = useStore((s) => s.ratings[animeId]);
  const setRating = useStore((s) => s.setRating);
  const size = large ? 'h-7 w-7' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Your rating">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <motion.button
          key={n}
          whileTap={{ scale: 0.8 }}
          onClick={() => {
            setRating(animeId, n);
            toast(`Rated ${n}/10`, 'success');
          }}
          role="radio"
          aria-checked={rating === n}
          aria-label={`Rate ${n} out of 10`}
          className={cn(
            size,
            'transition-colors',
            hydrated && rating && n <= rating ? 'text-warn' : 'text-line hover:text-warn/70',
          )}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
          </svg>
        </motion.button>
      ))}
      {hydrated && rating != null && (
        <span className="ml-1 text-xs text-ink-muted">{rating}/10</span>
      )}
    </div>
  );
}
