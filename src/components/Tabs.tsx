'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  initial = 0,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  initial?: number;
}) {
  const [active, setActive] = useState(initial);

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
              i === active ? 'text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {i === active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-rose"
                transition={{ duration: 0.25 }}
              />
            )}
          </button>
        ))}
      </div>
      <motion.div
        key={tabs[active].id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        role="tabpanel"
        className="pt-5"
      >
        {tabs[active].content}
      </motion.div>
    </div>
  );
}
