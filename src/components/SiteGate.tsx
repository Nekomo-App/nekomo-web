'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { Logo } from '@/components/Logo';

// Routes that stay reachable without a profile: legal/contact info and the
// separately-gated admin/developer areas.
const PUBLIC_PATHS = ['/login', '/dmca', '/contact'];
const PUBLIC_PREFIXES = ['/admin', '/developer', '/api'];

/**
 * Site-wide sign-in gate. Unauthenticated visitors are redirected to /login
 * (with a ?next= deep-link back to where they were going).
 * Demo auth is client-side — a production build should verify a session
 * cookie in middleware instead.
 */
export function SiteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);

  const allowed =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hydrated && !profile && !allowed) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, profile, allowed, pathname, router]);

  // Before hydration, render normally (SSR/first paint stay untouched).
  if (!hydrated || profile || allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Logo size={40} />
      <p className="mt-4 text-sm text-ink-muted">Sign in required — redirecting…</p>
    </div>
  );
}
