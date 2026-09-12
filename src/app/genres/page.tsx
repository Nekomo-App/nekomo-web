import type { Metadata } from 'next';
import { getAnimeGenres } from '@/lib/providers';
import { hashHue } from '@/lib/utils';
import { EmptyState } from '@/components/States';
import { GenreCard } from '@/components/GenreCard';

export const metadata: Metadata = { title: 'Genres' };
export const dynamic = 'force-dynamic';

export default async function GenresPage() {
  const genres = await getAnimeGenres();

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold">Genres</h1>
      <p className="mb-8 text-sm text-ink-muted">Browse the catalog by genre.</p>

      {!genres.length ? (
        <EmptyState
          title="No genres available"
          message="The metadata provider couldn't be reached. Try again later."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {genres.map((g, i) => (
            <GenreCard
              key={g.name}
              name={g.name}
              count={g.count}
              hue={(hashHue(g.name) + 300) % 360}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
