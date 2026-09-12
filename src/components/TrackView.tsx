'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

/** Records a "recently viewed" entry when mounted on a details page. */
export function TrackView({
  anime,
}: {
  anime: { id: string; title: string; poster?: string; artHue?: number; format?: string };
}) {
  const markViewed = useStore((s) => s.markViewed);
  useEffect(() => {
    markViewed(anime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.id]);
  return null;
}
