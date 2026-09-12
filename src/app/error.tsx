'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-ink-muted">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
      >
        Try again
      </button>
    </div>
  );
}
