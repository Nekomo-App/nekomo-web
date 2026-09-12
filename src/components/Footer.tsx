'use client';

import Link from 'next/link';
import { Logo } from './Logo';
import { useT } from '@/lib/i18n';

export function Footer({ dmcaEmail = 'legal@nekomo.example' }: { dmcaEmail?: string }) {
  const t = useT();
  return (
    <footer className="border-t border-line bg-bg-alt/60">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo size={30} />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">
            {t('footer.tagline')} {t('footer.legal')}
          </p>
          <p className="mt-3 max-w-xs rounded-xl border border-line bg-card/50 p-3 text-xs leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">Privacy tip:</span> {t('footer.privacy')}
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Explore
          </h3>
          <ul className="space-y-2 text-sm">
            {([
              ['nav.browse', '/browse'],
              ['nav.genres', '/genres'],
              ['nav.seasonal', '/seasonal'],
              ['nav.schedule', '/schedule'],
              ['nav.watchlist', '/watchlist'],
            ] as const).map(([key, href]) => (
              <li key={href}>
                <Link href={href} className="text-ink-muted transition-colors hover:text-rose-light">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Community
          </h3>
          <ul className="space-y-2 text-sm">
            {([
              ['Discord', 'https://discord.com/invite/E4Ezmgg7Ka'],
              ['GitHub org', 'https://github.com/Nekomo-App'],
              ['Nekomo app', 'https://github.com/Nekomo-App/Nekomo'],
              ['Android sources', 'https://github.com/Nekomo-App/neko-source'],
              ['This website', 'https://github.com/Nekomo-App/nekomo-web'],
            ] as const).map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-muted transition-colors hover:text-rose-light"
                >
                  {label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Legal
          </h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>Open-source project — sources are labeled by category.</li>
            <li>
              <Link href="/sources" className="text-rose-light hover:underline">
                Sources &amp; status
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-rose-light hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-rose-light hover:underline">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link href="/dmca" className="text-rose-light hover:underline">
                {t('footer.dmca')} &amp; copyright notices
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-rose-light hover:underline">
                {t('footer.contact')}
              </Link>
            </li>
            <li>
              Rights holders:{' '}
              <a href={`mailto:${dmcaEmail}`} className="text-rose-light hover:underline">
                {dmcaEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-muted">
        {t('footer.demo')}
      </div>
    </footer>
  );
}
