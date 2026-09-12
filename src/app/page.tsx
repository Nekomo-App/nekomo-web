import Link from 'next/link';
import {
  getAnimeGenres,
  getOfficialTrailers,
  getPopularAnime,
  getRecentlyUpdatedAnime,
  getSeasonalAnime,
  getTopRatedAnime,
  getTrendingAnime,
  getUpcomingAnime,
} from '@/lib/providers';
import { AnimeGrid, AnimeRow } from '@/components/AnimeRow';
import { HeroCarousel } from '@/components/HeroCarousel';
import {
  ContinueWatchingRow,
  RecentlyViewedRow,
  RecommendedRow,
  WatchlistPreviewRow,
} from '@/components/PersonalizedRows';
import { TrailerRow } from '@/components/TrailerRow';
import { EmptyState } from '@/components/States';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [trending, seasonal, topRated, upcoming, recent, popular, genres, trailers] =
    await Promise.all([
      getTrendingAnime(),
      getSeasonalAnime(),
      getTopRatedAnime(),
      getUpcomingAnime(),
      getRecentlyUpdatedAnime(),
      getPopularAnime(),
      getAnimeGenres(),
      getOfficialTrailers(),
    ]);

  const heroItems = trending.slice(0, 5);
  const recPool = [...trending, ...seasonal, ...topRated];
  const nothingLoaded = !trending.length && !seasonal.length;

  return (
    <div className="mx-auto max-w-[1560px] space-y-12 px-4 py-6 sm:px-6">
      <HeroCarousel items={heroItems} />

      {nothingLoaded ? (
        <EmptyState
          title="Catalog is taking a break"
          message="The metadata provider couldn't be reached and no cached data is available yet. Check your connection and try again."
          actionLabel="Browse originals"
          actionHref="/browse"
        />
      ) : (
        <>
          <ContinueWatchingRow />
          <WatchlistPreviewRow />
          <AnimeRow title="Trending Now" href="/browse?sort=popularity" items={trending.slice(5, 19)} />
          <AnimeRow title="Popular This Season" href="/seasonal" items={seasonal} />
          <AnimeRow title="Recently Updated" href="/browse?sort=updated" items={recent} />
          <RecommendedRow pool={recPool} />
          <AnimeRow title="New Releases" href="/browse?sort=release" items={seasonal.slice(0, 14)} />
          <AnimeRow title="Top Rated" href="/browse?sort=rating" items={topRated} />
          <AnimeRow title="Upcoming" href="/seasonal" items={upcoming} />
          <RecentlyViewedRow />

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Popular Genres</h2>
              <Link href="/genres" className="text-sm font-medium text-rose-light transition-colors hover:text-white">
                All genres →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {genres.slice(0, 14).map((g) => (
                <Link
                  key={g.name}
                  href={`/browse?genre=${encodeURIComponent(g.name)}`}
                  className="rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-muted transition-all hover:border-rose hover:text-white hover:shadow-glow-sm"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          </section>

          <TrailerRow trailers={trailers} />
        </>
      )}
    </div>
  );
}
