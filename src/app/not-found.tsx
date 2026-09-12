import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-rose">404</p>
      <h1 className="font-display text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
      >
        Back home
      </Link>
    </div>
  );
}
