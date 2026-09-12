'use client';

import { Modal } from './Modal';

/** Official trailer embed — only ever YouTube IDs supplied by the metadata provider. */
export function TrailerModal({
  youtubeId,
  title,
  open,
  onClose,
}: {
  youtubeId?: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open && !!youtubeId} onClose={onClose} label={`Trailer: ${title}`} wide>
      <div className="aspect-video w-full">
        {youtubeId && open && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
            title={`${title} — official trailer`}
            className="h-full w-full rounded-t-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-ink-muted">
          Official trailer · <span className="text-ink">{title}</span>
        </p>
        <button
          onClick={onClose}
          className="rounded-lg border border-line px-4 py-1.5 text-sm text-ink-muted transition-colors hover:border-rose hover:text-white"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
