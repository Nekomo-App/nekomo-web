import type { AnimeFormat, AnimeStatus, GenreInfo, SearchParams, SeasonName } from '@/lib/types';
import { getAnimeSearchResults } from '@/lib/providers';
import { AnimeGrid } from '@/components/AnimeRow';
import { FilterPanel } from '@/components/FilterPanel';
import { ResultsToolbar } from '@/components/ResultsToolbar';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/States';
import { Suspense } from 'react';
import { GridSkeleton } from '@/components/Skeletons';

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchParams {
  const str = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const listParam = (k: string) => str(k)?.split(',').filter(Boolean) ?? [];

  return {
    q: str('q')?.slice(0, 100),
    genres: listParam('genre'),
    formats: listParam('format').filter((f): f is AnimeFormat =>
      ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'].includes(f),
    ),
    statuses: listParam('status').filter((s): s is AnimeStatus =>
      ['AIRING', 'COMPLETED', 'UPCOMING'].includes(s),
    ),
    year: str('year') ? Number(str('year')) : undefined,
    season: (str('season') as SeasonName) || undefined,
    minRating: str('minRating') ? Number(str('minRating')) : undefined,
    hasSub: str('sub') === '1',
    hasDub: str('dub') === '1',
    hasOfficialStream: str('stream') === '1',
    sort: (str('sort') as SearchParams['sort']) || 'popularity',
    page: Math.max(1, Number(str('page') ?? 1) || 1),
    limit: 24,
  };
}

/**
 * Shared catalog layout used by /search and /browse.
 * Server component — fetches per request; Suspense keyed on the query so
 * skeletons animate in while the provider responds.
 */
export function CatalogView({
  params,
  genres,
}: {
  params: SearchParams;
  genres: GenreInfo[];
}) {
  const key = JSON.stringify(params);
  return (
    <>
      <FilterPanel genres={genres} />
      <div className="min-w-0 flex-1">
        <ResultsToolbar />
        <Suspense key={key} fallback={<GridSkeleton count={18} />}>
          <CatalogResults params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function CatalogResults({ params }: { params: SearchParams }) {
  const result = await getAnimeSearchResults(params);

  if (!result.items.length) {
    return (
      <EmptyState
        title={result.offline ? 'No matches in offline catalog' : 'No results found'}
        message={
          result.offline
            ? 'The metadata provider is unreachable, and the bundled catalog has no match for these filters. Try fewer filters.'
            : 'Try a different title, or remove some filters.'
        }
        actionLabel="Clear filters"
        actionHref="/search"
      />
    );
  }

  return (
    <>
      {result.offline && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 text-xs text-warn">
          Metadata provider unreachable — showing the bundled catalog.
        </p>
      )}
      <p className="mb-4 text-sm text-ink-muted">
        {result.total.toLocaleString()} result{result.total === 1 ? '' : 's'}
        {params.q && (
          <>
            {' '}
            for <span className="text-ink">“{params.q}”</span>
          </>
        )}
      </p>
      <AnimeGrid items={result.items} />
      <Pagination page={result.page} hasMore={result.hasMore} total={result.total} />
    </>
  );
}
