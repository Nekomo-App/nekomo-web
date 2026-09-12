'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PublicSource {
  id: string;
  kind: 'source' | 'api';
  name: string;
  type: string;
  baseUrl: string;
  category: string;
  label: string;
  verified: boolean;
  status: string;
  description?: string;
  logoUrl?: string;
  maintainer?: string;
  features: string[];
  languages: string[];
  regions: string[];
  docsUrl?: string;
  legal: { terms?: string; privacy?: string; dmca?: string };
  health: { latencyMs?: number; lastOk?: string; lastCheckAt?: string };
  createdAt: string;
  updatedAt: string;
}

export const STATUS_STYLE: Record<string, string> = {
  working: 'bg-success/15 text-success',
  partial: 'bg-warn/15 text-warn',
  offline: 'bg-danger/15 text-danger',
  error: 'bg-danger/15 text-danger',
  review: 'bg-rose/15 text-rose-light',
  disabled: 'bg-line/40 text-ink-muted',
  unknown: 'bg-line/40 text-ink-muted',
};

export const STATUS_TEXT: Record<string, string> = {
  working: 'Working',
  partial: 'Partially working',
  offline: 'Offline',
  error: 'Error',
  review: 'Under review',
  disabled: 'Disabled',
  unknown: 'Not checked',
};

const CATEGORY_ORDER = ['official', 'open-api', 'open-source', 'community', 'non-official', 'custom'];
const CATEGORY_SECTIONS: Record<string, { title: string; blurb: string }> = {
  official: { title: 'Official Sources', blurb: 'First-party content and services operated or licensed by Nekomo.' },
  'open-api': { title: 'Open APIs', blurb: 'Free, documented public APIs used for metadata and catalog data.' },
  'open-source': { title: 'Open-Source Tools', blurb: 'Open-source services and datasets maintained by their communities.' },
  community: { title: 'Community Sources', blurb: 'Maintained by community contributors. Reviewed before listing.' },
  'non-official': { title: 'Non-Official Sources', blurb: 'Third-party sources with no affiliation or endorsement. Unverified — use at your own discretion and check their terms.' },
  custom: { title: 'Custom Sources', blurb: 'User-submitted sources. Reviewed before public listing; always unverified unless marked otherwise.' },
};

export function SourcesDirectory({ sources }: { sources: PublicSource[] }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'name' | 'status'>('name');

  const filtered = useMemo(() => {
    let list = sources;
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((s) =>
        [s.name, s.description, s.type, s.label, ...(s.features ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }
    if (category !== 'all') list = list.filter((s) => s.category === category);
    if (status !== 'all') list = list.filter((s) => s.status === status);
    return [...list].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : a.status.localeCompare(b.status),
    );
  }, [sources, q, category, status, sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicSource[]>();
    for (const s of filtered) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [filtered]);

  const sel = 'min-h-[40px] rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-rose';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sources…"
          aria-label="Search sources"
          className={cn(sel, 'min-w-48 flex-1 sm:flex-none')}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={sel}>
          <option value="all">All categories</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_SECTIONS[c].title}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={sel}>
          <option value="all">Any status</option>
          {['working', 'partial', 'offline', 'error'].map((s) => (
            <option key={s} value={s}>{STATUS_TEXT[s]}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'name')} aria-label="Sort sources" className={sel}>
          <option value="name">Sort: name</option>
          <option value="status">Sort: status</option>
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-muted">
          No sources match your filters.
        </p>
      ) : (
        grouped.map(({ category: cat, items }) => (
          <section key={cat} className="mt-10">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{CATEGORY_SECTIONS[cat]?.title ?? cat}</h2>
              <span className="text-xs text-ink-muted">{items.length} source{items.length > 1 ? 's' : ''}</span>
            </div>
            <p className="mb-4 max-w-2xl text-sm text-ink-muted">{CATEGORY_SECTIONS[cat]?.blurb}</p>
            {(cat === 'non-official' || cat === 'custom') && (
              <p className="mb-4 rounded-xl border border-warn/40 bg-warn/5 px-4 py-2.5 text-xs text-warn">
                These sources are not operated by, affiliated with, or endorsed by Nekomo. They are
                unverified — you are responsible for how you use them and for complying with their
                terms and applicable law.
              </p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Link
                    href={`/sources/${s.id}`}
                    className="block rounded-2xl border border-line bg-card p-4 transition-all hover:border-rose hover:shadow-glow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display font-semibold">{s.name}</span>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[s.status])}>
                        {STATUS_TEXT[s.status] ?? s.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">{s.label}</span>
                      {!s.verified && (
                        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Unverified</span>
                      )}
                      <span className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">{s.type}</span>
                    </div>
                    {s.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{s.description}</p>
                    )}
                    {s.health?.lastCheckAt && (
                      <p className="mt-2 text-[11px] text-ink-muted">
                        Last checked {new Date(s.health.lastCheckAt).toLocaleString()}
                      </p>
                    )}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
