'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function GenreCard({
  name,
  count,
  hue,
  index,
}: {
  name: string;
  count?: number;
  hue: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
    >
      <Link
        href={`/browse?genre=${encodeURIComponent(name)}`}
        className="group relative block overflow-hidden rounded-xl border border-line p-5 transition-all hover:border-rose/60 hover:shadow-glow-sm"
        style={{
          background: `linear-gradient(140deg, hsl(${hue} 45% 22% / 0.55), #1B101B 65%)`,
        }}
      >
        <span className="font-display text-base font-semibold text-white transition-colors group-hover:text-rose-light">
          {name}
        </span>
        {count != null && (
          <span className="mt-1 block text-xs text-ink-muted">{count.toLocaleString()} titles</span>
        )}
        <svg
          width="56" height="56" viewBox="0 0 48 48" fill="none" aria-hidden="true"
          className="absolute -right-3 -top-3 opacity-[0.08] transition-opacity group-hover:opacity-20"
        >
          <path d="M10 20 L13 5 L24 13 Z" fill="#F4A7CD" />
          <path d="M38 20 L35 5 L24 13 Z" fill="#F4A7CD" />
          <path d="M24 11 C35 11 42 18 42 28 C42 38 34 44 24 44 C14 44 6 38 6 28 C6 18 13 11 24 11 Z" fill="#F4A7CD" />
        </svg>
      </Link>
    </motion.div>
  );
}
