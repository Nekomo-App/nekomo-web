import Link from 'next/link';

export function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card/40 px-6 py-14 text-center">
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="text-rose/60" aria-hidden="true">
        <path d="M10 20 L13 5 L24 13 Z" fill="currentColor" />
        <path d="M38 20 L35 5 L24 13 Z" fill="currentColor" />
        <path
          d="M24 11 C35 11 42 18 42 28 C42 38 34 44 24 44 C14 44 6 38 6 28 C6 18 13 11 24 11 Z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-full bg-rose px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <h3 className="font-display text-lg font-semibold text-danger">Something went wrong</h3>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-full border border-line px-5 py-2 text-sm font-semibold transition-colors hover:border-rose hover:text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
