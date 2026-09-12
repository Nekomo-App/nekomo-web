'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { TrailerEntry } from '@/lib/types';
import { SectionHeader } from './AnimeRow';
import { TrailerModal } from './TrailerModal';

export function TrailerRow({ trailers }: { trailers: TrailerEntry[] }) {
  const [active, setActive] = useState<TrailerEntry | null>(null);
  if (!trailers.length) return null;

  return (
    <section>
      <SectionHeader title="Official Trailers" />
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {trailers.map((t, i) => (
          <motion.button
            key={`${t.animeId}-${t.youtubeId}`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.35) }}
            onClick={() => setActive(t)}
            className="group w-64 shrink-0 snap-start text-left"
            aria-label={`Play official trailer for ${t.title}`}
          >
            <div className="relative aspect-video overflow-hidden rounded-xl border border-line transition-all group-hover:border-rose/60 group-hover:shadow-glow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/10">
                <span className="rounded-full bg-black/60 p-3 text-white backdrop-blur transition-transform group-hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </div>
            </div>
            <p className="mt-2 truncate text-sm font-medium text-ink group-hover:text-rose-light">{t.title}</p>
          </motion.button>
        ))}
      </div>
      <TrailerModal
        youtubeId={active?.youtubeId}
        title={active?.title ?? ''}
        open={!!active}
        onClose={() => setActive(null)}
      />
    </section>
  );
}
