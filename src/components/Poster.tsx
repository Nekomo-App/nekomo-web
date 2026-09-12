'use client';

import { useState } from 'react';
import { cn, hashHue } from '@/lib/utils';

/**
 * Poster image with lazy loading, fade-in on load, and generated
 * gradient artwork when no image exists (original catalog entries).
 */
export function Poster({
  src,
  title,
  artHue,
  className,
  sizes,
  priority,
}: {
  src?: string;
  title: string;
  artHue?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showArt = !src || failed;
  const hue = artHue ?? hashHue(title);

  return (
    <div className={cn('relative overflow-hidden bg-card', className)}>
      {showArt ? (
        <GeneratedArt title={title} hue={hue} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn('poster-img h-full w-full object-cover', loaded && 'loaded')}
        />
      )}
    </div>
  );
}

function GeneratedArt({ title, hue }: { title: string; hue: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
      style={{
        background: `
          radial-gradient(140% 90% at 20% 0%, hsl(${hue} 55% 30% / 0.9), transparent 60%),
          radial-gradient(120% 90% at 90% 100%, hsl(${(hue + 40) % 360} 60% 22% / 0.9), transparent 55%),
          linear-gradient(160deg, #261323 0%, #100A12 100%)`,
      }}
    >
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="opacity-40">
        <path d="M10 20 L13 5 L24 13 Z" fill={`hsl(${hue} 70% 65%)`} />
        <path d="M38 20 L35 5 L24 13 Z" fill={`hsl(${hue} 70% 65%)`} />
        <path
          d="M24 11 C35 11 42 18 42 28 C42 38 34 44 24 44 C14 44 6 38 6 28 C6 18 13 11 24 11 Z"
          fill={`hsl(${hue} 70% 65%)`}
        />
      </svg>
      <span className="text-center font-display text-sm font-semibold leading-snug text-ink/80">
        {title}
      </span>
    </div>
  );
}
