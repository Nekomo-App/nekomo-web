'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/States';
import { LibraryView } from '@/components/LibraryView';
import { GridSkeleton } from '@/components/Skeletons';
import { ContinueWatchingRow } from '@/components/PersonalizedRows';
import { useHydrated, useStore } from '@/lib/store';
import type { AnimeSummary } from '@/lib/types';
import { Modal } from '@/components/Modal';

export default function HistoryPage() {
  const hydrated = useHydrated();
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);
  const [confirm, setConfirm] = useState(false);

  const items: AnimeSummary[] = history.map((h) => ({
    id: h.id,
    provider: 'local',
    title: h.title,
    poster: h.poster,
    artHue: h.artHue,
    format: (h.format as AnimeSummary['format']) ?? 'TV',
    status: 'COMPLETED',
    genres: [],
    hasSub: false,
    hasDub: false,
    hasOfficialStream: false,
  }));

  return (
    <div className="mx-auto max-w-[1560px] space-y-12 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Watch History</h1>
          <p className="mt-1 text-sm text-ink-muted">Progress and recently viewed titles on this device.</p>
        </div>
        {hydrated && history.length > 0 && (
          <button
            onClick={() => setConfirm(true)}
            className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Clear history
          </button>
        )}
      </div>

      {!hydrated ? (
        <GridSkeleton count={6} />
      ) : (
        <>
          <ContinueWatchingRow />
          {items.length ? (
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Recently Viewed</h2>
              <LibraryView items={items} />
            </section>
          ) : (
            <EmptyState
              title="No history yet"
              message="Open any anime details page or start an episode and it'll show up here."
              actionLabel="Find something to watch"
              actionHref="/"
            />
          )}
        </>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} label="Clear history">
        <div className="p-5">
          <h3 className="font-display text-lg font-bold">Clear watch history?</h3>
          <p className="mt-2 text-sm text-ink-muted">
            This removes recently viewed titles and saved episode progress from this device.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirm(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearHistory();
                setConfirm(false);
              }}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Clear
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
