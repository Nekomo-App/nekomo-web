import type { Metadata } from 'next';
import { CatalogView, parseSearchParams } from '@/components/Catalog';
import { getAnimeGenres } from '@/lib/providers';

export const metadata: Metadata = { title: 'Browse' };
export const dynamic = 'force-dynamic';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const genres = await getAnimeGenres();
  const params = parseSearchParams(searchParams);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold">Browse</h1>
      <p className="mb-8 text-sm text-ink-muted">
        Filter the catalog by format, status, genre, season, and availability.
      </p>
      <div className="flex gap-8">
        <CatalogView params={params} genres={genres} />
      </div>
    </div>
  );
}
