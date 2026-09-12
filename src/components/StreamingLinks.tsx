'use client';

// Shared "where to watch" link list — staggered fade-in, Free badge for
// ad-supported/licensor-uploaded sources. Two layouts: 'cards' for page
// sections, 'compact' for the watch-page sidebar.

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StreamingLink } from '@/lib/types';

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

function FreeBadge() {
  return (
    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
      Free
    </span>
  );
}

export function StreamingLinks({
  links,
  variant = 'cards',
}: {
  links: StreamingLink[];
  variant?: 'cards' | 'compact';
}) {
  if (!links.length)
    return <p className="text-sm text-ink-muted">No official sources known yet.</p>;

  if (variant === 'compact') {
    return (
      <motion.ul
        className="space-y-1.5"
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {links.map((l) => (
          <motion.li key={l.platform + l.url} variants={item}>
            <a
              href={l.url}
              target={l.url.startsWith('http') ? '_blank' : undefined}
              rel={l.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-2 text-sm text-rose-light hover:underline"
            >
              {l.platform} ↗
              {l.free && <FreeBadge />}
            </a>
            {l.note && <p className="text-xs text-ink-muted">{l.note}</p>}
          </motion.li>
        ))}
      </motion.ul>
    );
  }

  return (
    <motion.ul
      className="space-y-2"
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {links.map((l) => (
        <motion.li key={l.platform + l.url} variants={item}>
          <a
            href={l.url}
            target={l.url.startsWith('http') ? '_blank' : undefined}
            rel={l.url.startsWith('http') ? 'noopener noreferrer' : undefined}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border border-line bg-card/60 px-4 py-3',
              'transition-all hover:border-rose hover:shadow-glow-sm',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {l.platform}
              {l.free && <FreeBadge />}
            </span>
            <span className="text-right text-xs text-ink-muted">{l.note ?? 'Official'} ↗</span>
          </a>
        </motion.li>
      ))}
    </motion.ul>
  );
}
