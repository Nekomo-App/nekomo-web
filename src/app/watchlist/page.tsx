'use client';

import { EmptyState } from '@/components/States';
import { GridSkeleton } from '@/components/Skeletons';
import { LibraryView } from '@/components/LibraryView';
import { useHydrated, useStore } from '@/lib/store';

export default function WatchlistPage() {
  const hydrated = useHydrated();
  const watchlist = useStore((s) => s.watchlist);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold">My Watchlist</h1>
      <p className="mb-8 text-sm text-ink-muted">
        {hydrated ? `${watchlist.length} title${watchlist.length === 1 ? '' : 's'} saved on this device.` : 'Your saved titles.'}
      </p>

      {!hydrated ? (
        <GridSkeleton count={6} />
      ) : watchlist.length ? (
        <LibraryView items={watchlist} removable />
      ) : (
        <EmptyState
          title="Your watchlist is empty"
          message="Tap the heart on any anime card to save it here for later."
          actionLabel="Discover anime"
          actionHref="/browse"
        />
      )}
    </div>
  );
}
