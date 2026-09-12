'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Pagination({ page, hasMore, total }: { page: number; hasMore: boolean; total: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('page', String(p));
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          'rounded-lg border border-line px-4 py-2 text-sm transition-colors',
          page <= 1
            ? 'pointer-events-none text-ink-muted/40'
            : 'text-ink-muted hover:border-rose hover:text-white',
        )}
      >
        ← Prev
      </Link>
      <span className="text-sm text-ink-muted">
        Page <span className="font-semibold text-ink">{page}</span>
        {total > 0 && <span className="hidden sm:inline"> · {total.toLocaleString()} results</span>}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={!hasMore}
        className={cn(
          'rounded-lg border border-line px-4 py-2 text-sm transition-colors',
          !hasMore
            ? 'pointer-events-none text-ink-muted/40'
            : 'text-ink-muted hover:border-rose hover:text-white',
        )}
      >
        Next →
      </Link>
    </nav>
  );
}
