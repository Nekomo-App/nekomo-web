'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { Logo } from '@/components/Logo';
import { AniListSync } from '@/components/AniListSync';

// Routes that stay reachable without a profile: legal/contact info and the
// separately-gated admin/developer areas.
const PUBLIC_PATHS = ['/login', '/dmca', '/contact'];
const PUBLIC_PREFIXES = ['/admin', '/developer', '/api'];

/**
 * Site-wide sign-in gate. Checks the local profile first, then the
 * server-side AniList session cookie via /api/auth/me. Unauthenticated
 * visitors are redirected to /login (with a ?next= deep-link back).
 */
export function SiteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [serverChecked, setServerChecked] = useState(false);
  const fetching = useRef(false);

  const allowed =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!hydrated || profile || fetching.current) return;
    fetching.current = true;

    // Local profile is absent — the server session may still be valid
    // (e.g. cleared localStorage). /api/auth/me reads the HttpOnly cookie.
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile({ name: d.user.name, avatar: d.user.avatar, provider: 'anilist' });
        } else if (!allowed) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (!allowed) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => setServerChecked(true));
  }, [hydrated, profile, allowed, pathname, router, setProfile]);

  if (!hydrated || profile || allowed) {
    return (
      <>
        <AniListSync />
        {children}
      </>
    );
  }
  if (!serverChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-rose" />
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Logo size={40} />
      <p className="mt-4 text-sm text-ink-muted">Sign in required — redirecting…</p>
    </div>
  );
}
