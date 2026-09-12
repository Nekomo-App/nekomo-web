'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Collapses long synopses behind a "Read more" toggle on small screens. */
export function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 380;

  return (
    <div>
      <p
        className={cn(
          'whitespace-pre-line text-sm leading-relaxed text-ink-muted sm:text-base',
          long && !expanded && 'clamp-3',
        )}
      >
        {text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 text-sm font-medium text-rose-light hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
