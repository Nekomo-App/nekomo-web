'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimeSummary } from '@/lib/types';
import { cn, formatScore, formatStatus } from '@/lib/utils';
import { Poster } from './Poster';

const AUTOPLAY_MS = 7000;

export function HeroCarousel({ items }: { items: AnimeSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, go, items.length]);

  if (!items.length) return null;
  const a = items[index];
  const firstPlayable = a.hasOfficialStream;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured anime"
      className="relative overflow-hidden rounded-2xl border border-line"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="relative h-[380px] sm:h-[460px] md:h-[540px]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={a.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {/* background */}
            <div className="absolute inset-0">
              {a.banner || a.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.banner ?? a.poster}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-105 object-cover object-top blur-[2px]"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `radial-gradient(120% 100% at 30% 0%, hsl(${(a.artHue ?? 320)} 55% 26% / 0.95), transparent 60%), linear-gradient(160deg, #261323, #100A12)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            </div>

            {/* content */}
            <div className="relative flex h-full max-w-2xl flex-col justify-end gap-4 p-6 sm:p-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="font-semibold text-warn">★ {formatScore(a.rating)}</span>
                  <span>·</span>
                  <span>{a.year ?? '—'}</span>
                  <span>·</span>
                  <span>{formatStatus(a.status)}</span>
                  <span>·</span>
                  <span className="text-rose-light">{a.format}</span>
                </div>
                <h1 className="font-display text-[clamp(1.7rem,5vw,3.2rem)] font-extrabold leading-tight text-white drop-shadow-lg">
                  {a.title}
                </h1>
                {a.japaneseTitle && (
                  <p className="mt-1 text-sm text-ink-muted">{a.japaneseTitle}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.genres.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-line bg-black/40 px-2.5 py-0.5 text-xs text-ink-muted backdrop-blur"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <p className="clamp-3 mt-3 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
                  {a.synopsis}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {firstPlayable && (
                    <Link
                      href={`/watch/${a.id}/ep-1`}
                      className="inline-flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-rose-mid hover:shadow-glow"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch Now
                    </Link>
                  )}
                  <Link
                    href={`/anime/${a.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-black/40 px-6 py-2.5 text-sm font-semibold text-ink backdrop-blur transition-all hover:border-rose hover:text-white"
                  >
                    View Details
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* side poster on wide screens */}
        <div className="absolute bottom-8 right-10 hidden w-44 overflow-hidden rounded-xl border border-line shadow-glow-sm lg:block">
          <Poster src={a.poster} title={a.title} artHue={a.artHue} className="aspect-[2/3]" />
        </div>

        {/* arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous featured anime"
              className="absolute left-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/40 p-2.5 text-ink-muted backdrop-blur transition-all hover:border-rose hover:text-white sm:left-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next featured anime"
              className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/40 p-2.5 text-ink-muted backdrop-blur transition-all hover:border-rose hover:text-white sm:right-4 lg:right-64"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        {/* indicators */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Featured slides">
          {items.map((item, i) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${item.title}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-7 bg-rose' : 'w-1.5 bg-ink-muted/40 hover:bg-ink-muted',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
