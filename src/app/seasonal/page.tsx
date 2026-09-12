import type { Metadata } from 'next';
import Link from 'next/link';
import type { SeasonName } from '@/lib/types';
import { getSeasonalAnime } from '@/lib/providers';
import { currentSeason, cn } from '@/lib/utils';
import { AnimeGrid } from '@/components/AnimeRow';
import { EmptyState } from '@/components/States';

export const metadata: Metadata = { title: 'Seasonal' };
export const dynamic = 'force-dynamic';

const SEASONS: SeasonName[] = ['winter', 'spring', 'summer', 'fall'];

function prevSeason(season: SeasonName, year: number) {
  const i = SEASONS.indexOf(season);
  return i === 0 ? { season: 'fall' as SeasonName, year: year - 1 } : { season: SEASONS[i - 1], year };
}
function nextSeason(season: SeasonName, year: number) {
  const i = SEASONS.indexOf(season);
  return i === 3 ? { season: 'winter' as SeasonName, year: year + 1 } : { season: SEASONS[i + 1], year };
}

export default async function SeasonalPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const cur = currentSeason();
  const rawSeason = typeof searchParams.season === 'string' ? searchParams.season : cur.season;
  const season = (SEASONS.includes(rawSeason as SeasonName) ? rawSeason : cur.season) as SeasonName;
  const year = Number(searchParams.year) || cur.year;

  const items = await getSeasonalAnime(season, year);
  const prev = prevSeason(season, year);
  const next = nextSeason(season, year);
  const label = `${season.charAt(0).toUpperCase() + season.slice(1)} ${year}`;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Seasonal Anime</h1>
          <p className="mt-1 text-sm text-ink-muted">{label} season</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/seasonal?season=${prev.season}&year=${prev.year}`}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-white"
          >
            ← {prev.season} {prev.year}
          </Link>
          <Link
            href={`/seasonal?season=${next.season}&year=${next.year}`}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-white"
          >
            {next.season} {next.year} →
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {SEASONS.map((s) => (
          <Link
            key={s}
            href={`/seasonal?season=${s}&year=${year}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              s === season ? 'bg-rose text-white' : 'border border-line text-ink-muted hover:border-rose hover:text-white',
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {items.length ? (
        <AnimeGrid items={items} />
      ) : (
        <EmptyState
          title={`Nothing found for ${label}`}
          message="This season may not be announced yet, or the provider is unreachable."
          actionLabel="Current season"
          actionHref="/seasonal"
        />
      )}
    </div>
  );
}
