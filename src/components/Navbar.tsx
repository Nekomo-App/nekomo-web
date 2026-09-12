'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';
import { useHydrated, useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { toast } from './Toaster';

const LINKS = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/browse', labelKey: 'nav.browse' },
  { href: '/seasonal', labelKey: 'nav.seasonal' },
  { href: '/schedule', labelKey: 'nav.schedule' },
] as const;

type NavKey = (typeof LINKS)[number]['labelKey'];

const POPULAR_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
];

const BOTTOM_NAV = [
  { href: '/', labelKey: 'nav.home', icon: 'M3 10.5 12 3l9 7.5V21H3z' },
  { href: '/search', labelKey: 'nav.search', icon: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.3-4.3' },
  { href: '/schedule', labelKey: 'nav.schedule', icon: 'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: 'M6 3h12v18l-6-4-6 4z' },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [q, setQ] = useState('');
  const accountRef = useRef<HTMLDivElement>(null);
  const genresRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const setReducedMotion = useStore((s) => s.setReducedMotion);
  const profile = useStore((s) => s.profile);
  const hydrated = useHydrated();
  const t = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
    setGenresOpen(false);
  }, [pathname]);

  // Lock body scroll + focus trap while the drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const first = drawerRef.current?.querySelector<HTMLElement>('button, a');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a, button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [drawerOpen]);

  // Outside click / Escape for dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (genresRef.current && !genresRef.current.contains(e.target as Node)) setGenresOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
        setGenresOpen(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    else router.push('/search');
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300 safe-t',
          scrolled ? 'glass shadow-lg' : 'bg-transparent',
        )}
      >
        <nav className="mx-auto flex h-16 max-w-[1560px] items-center gap-3 px-4 safe-x sm:px-6">
          <Link href="/" aria-label="Nekomo home" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden items-center gap-0.5 lg:flex xl:gap-1">
            {LINKS.slice(0, 2).map((l) => (
              <NavLink key={l.href} href={l.href} label={t(l.labelKey)} pathname={pathname} />
            ))}

            {/* Genres dropdown */}
            <div className="relative" ref={genresRef}>
              <button
                onClick={() => setGenresOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={genresOpen}
                className={cn(
                  'flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-white',
                  pathname === '/genres' && 'text-rose-light',
                )}
              >
                {t('nav.genres')}
                <motion.svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  animate={{ rotate: genresOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </button>
              <AnimatePresence>
                {genresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    role="menu"
                    className="absolute left-0 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-card shadow-glow-sm"
                  >
                    <div className="grid grid-cols-2 gap-0.5 p-2">
                      {POPULAR_GENRES.map((g) => (
                        <Link
                          key={g}
                          href={`/browse?genre=${encodeURIComponent(g)}`}
                          role="menuitem"
                          className="rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-rose/10 hover:text-white"
                        >
                          {g}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/genres"
                      role="menuitem"
                      className="block border-t border-line px-4 py-2.5 text-sm font-medium text-rose-light transition-colors hover:bg-rose/10"
                    >
                      {t('nav.allGenres')}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {LINKS.slice(2).map((l) => (
              <NavLink key={l.href} href={l.href} label={t(l.labelKey)} pathname={pathname} />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <form onSubmit={submit} className="hidden md:block" role="search">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="search"
                  placeholder={t('nav.searchPlaceholder')}
                  aria-label="Search anime"
                  className="h-10 w-40 rounded-full border border-line bg-bg-alt/80 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/60 transition-all focus:w-60 focus:border-rose focus:shadow-glow-sm focus:outline-none xl:w-48"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </div>
            </form>

            <Link
              href="/watchlist"
              className={cn(
                'hidden min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:text-white sm:flex',
                pathname === '/watchlist' && 'text-rose-light',
              )}
            >
              {t('nav.watchlist')}
            </Link>
            <Link
              href="/history"
              className={cn(
                'hidden min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:text-white xl:flex',
                pathname === '/history' && 'text-rose-light',
              )}
            >
              {t('nav.history')}
            </Link>

            <NotificationBell />

            {/* Account menu */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Account menu"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line bg-card p-2.5 text-ink-muted transition-all hover:border-rose hover:text-white hover:shadow-glow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
                </svg>
              </button>
              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-glow-sm"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="text-sm font-semibold">
                        {hydrated && profile ? profile.name : 'Guest'}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {hydrated && profile ? profile.email : 'Local profile — no sign-in needed'}
                      </p>
                    </div>
                    {([
                      { href: '/watchlist', key: 'nav.watchlist' },
                      { href: '/history', key: 'nav.history' },
                      { href: '/settings', key: 'nav.settings' },
                      { href: '/search', key: 'nav.search' },
                    ] as const).map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        role="menuitem"
                        className="block px-4 py-2.5 text-sm text-ink-muted transition-colors hover:bg-rose/10 hover:text-white"
                      >
                        {t(i.key)}
                      </Link>
                    ))}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setReducedMotion(!reducedMotion);
                        toast(reducedMotion ? 'Animations enabled' : 'Reduced motion enabled', 'success');
                      }}
                      aria-pressed={reducedMotion}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-rose/10 hover:text-white"
                    >
                      {t('nav.reducedMotion')}
                      <span className={cn('h-4 w-8 rounded-full p-0.5 transition-colors', reducedMotion ? 'bg-rose' : 'bg-line')}>
                        <span className={cn('block h-3 w-3 rounded-full bg-white transition-transform', reducedMotion && 'translate-x-4')} />
                      </span>
                    </button>
                    <Link
                      href="/login"
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-sm text-rose-light transition-colors hover:bg-rose/10"
                    >
                      {hydrated && profile ? t('nav.account') : t('nav.signIn')}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:text-white lg:hidden"
            >
              <motion.svg
                width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                animate={{ rotate: drawerOpen ? 90 : 0 }}
                transition={{ duration: 0.25 }}
              >
                {drawerOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </motion.svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              ref={drawerRef as React.RefObject<HTMLElement>}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 z-[70] flex h-full w-72 max-w-[85vw] flex-col border-l border-line bg-bg-alt lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between border-b border-line p-4 safe-t">
                <Logo size={28} />
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-ink-muted hover:text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                {([
                  ...LINKS,
                  { href: '/genres', labelKey: 'nav.genres' },
                  { href: '/watchlist', labelKey: 'nav.watchlist' },
                  { href: '/history', labelKey: 'nav.history' },
                  { href: '/settings', labelKey: 'nav.settings' },
                  { href: '/login', labelKey: (hydrated && profile ? 'nav.account' : 'nav.signIn') as NavKey },
                ] as const).map((l, i) => (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                  >
                    <Link
                      href={l.href}
                      aria-current={pathname === l.href ? 'page' : undefined}
                      className={cn(
                        'block min-h-[48px] rounded-xl px-4 py-3.5 text-base font-medium text-ink-muted transition-colors hover:bg-rose/10 hover:text-white',
                        pathname === l.href && 'bg-rose/15 text-rose-light',
                      )}
                    >
                      {t(l.labelKey)}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="border-t border-line p-4 text-xs text-ink-muted safe-b">
                {t('footer.tagline')}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav — respects safe areas, 44px+ targets */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-line bg-bg-alt/95 backdrop-blur-md safe-b safe-x md:hidden"
        aria-label="Quick navigation"
      >
        {BOTTOM_NAV.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={pathname === i.href ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] text-ink-muted transition-colors',
              pathname === i.href && 'text-rose',
            )}
          >
            {pathname === i.href && (
              <motion.span
                layoutId="bottomnav-dot"
                className="absolute top-0 h-0.5 w-8 rounded-full bg-rose"
                transition={{ duration: 0.25 }}
              />
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={i.icon} />
            </svg>
            {t(i.labelKey)}
          </Link>
        ))}
        <Link
          href="/login"
          aria-current={pathname === '/login' ? 'page' : undefined}
          className={cn(
            'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] text-ink-muted transition-colors',
            pathname === '/login' && 'text-rose',
          )}
        >
          {pathname === '/login' && (
            <motion.span
              layoutId="bottomnav-dot"
              className="absolute top-0 h-0.5 w-8 rounded-full bg-rose"
              transition={{ duration: 0.25 }}
            />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
          {t('nav.account')}
        </Link>
      </nav>

      {/* Spacer below fixed header */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-white',
        active && 'text-rose-light',
      )}
    >
      {label}
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-rose"
          transition={{ duration: 0.25 }}
        />
      )}
    </Link>
  );
}
