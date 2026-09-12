import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  const dmca = process.env.DMCA_CONTACT_EMAIL || 'legal@nekomo.example';
  return (
    <footer className="border-t border-line bg-bg-alt/60">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <Logo size={30} />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">
            Discover your next story. Anime discovery with legally authorized streaming only.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Explore
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              ['Browse', '/browse'],
              ['Genres', '/genres'],
              ['Seasonal', '/seasonal'],
              ['Schedule', '/schedule'],
              ['Watchlist', '/watchlist'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-ink-muted transition-colors hover:text-rose-light">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Legal
          </h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>Metadata via the Jikan API (MyAnimeList data).</li>
            <li>Streams shown only when licensed or explicitly permitted.</li>
            <li>
              <Link href="/dmca" className="text-rose-light hover:underline">
                DMCA &amp; copyright notices
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-rose-light hover:underline">
                Contact us
              </Link>
            </li>
            <li>
              Rights holders:{' '}
              <a href={`mailto:${dmca}`} className="text-rose-light hover:underline">
                {dmca}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-muted">
        Nekomō — an original demo project. Not affiliated with any existing platform.
      </div>
    </footer>
  );
}
