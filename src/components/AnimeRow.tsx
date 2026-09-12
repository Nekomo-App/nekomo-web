'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { AnimeSummary } from '@/lib/types';
import { AnimeCard } from './AnimeCard';

export function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-rose-light transition-colors hover:text-white"
        >
          View all →
        </Link>
      )}
    </div>
  );
}

/** Horizontally scrolling card row with edge-fade arrows. */
export function AnimeRow({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: AnimeSummary[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scroll = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="relative">
      <SectionHeader title={title} href={href} />
      <div className="group/row relative">
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute -left-2 top-[38%] z-10 hidden rounded-full border border-line bg-card/90 p-2 text-ink-muted opacity-0 shadow-glow-sm transition-opacity hover:text-white group-hover/row:opacity-100 md:block"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          ref={scroller}
          className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2"
        >
          {items.map((a, i) => (
            <div key={a.id} className="w-40 shrink-0 snap-start sm:w-44">
              <AnimeCard anime={a} index={i} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="absolute -right-2 top-[38%] z-10 hidden rounded-full border border-line bg-card/90 p-2 text-ink-muted opacity-0 shadow-glow-sm transition-opacity hover:text-white group-hover/row:opacity-100 md:block"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}

export function AnimeGrid({ items }: { items: AnimeSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 min-[481px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {items.map((a, i) => (
        <AnimeCard key={a.id} anime={a} index={i} />
      ))}
    </div>
  );
}
