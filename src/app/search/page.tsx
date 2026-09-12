import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogView, parseSearchParams } from '@/components/Catalog';
import { SearchBar } from '@/components/SearchBar';
import { getAnimeGenres } from '@/lib/providers';

export const metadata: Metadata = { title: 'Search' };
export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const genres = await getAnimeGenres();
  const params = parseSearchParams(searchParams);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold">Search</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Find anime by title, studio, genre, year, format, and more.
      </p>
      <div className="mb-8 max-w-2xl">
        <SearchBar autoFocus />
      </div>
      <div className="flex gap-8">
        <CatalogView params={params} genres={genres} />
      </div>
    </div>
  );
}
