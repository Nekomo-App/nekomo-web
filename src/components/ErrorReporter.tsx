'use client';

import { useEffect } from 'react';
import { toast } from '@/components/Toaster';
import { useStore } from '@/lib/store';

/**
 * Global client error capture: uncaught errors + unhandled rejections
 * surface a brief toast and are logged server-side (rate-limited) so
 * they appear on the admin error dashboard.
 */
export function ErrorReporter() {
  const notify = useStore((s) => s.notify);

  useEffect(() => {
    let last = 0;
    const report = (message: string, context: string) => {
      const now = Date.now();
      if (now - last < 2000) return; // don't spam toasts on error storms
      last = now;
      toast('Something went wrong — the error was logged', 'error');
      notify('Error logged', message.slice(0, 120));
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, url: location.pathname }),
      }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => report(e.message || 'script error', 'window.onerror');
    const onRejection = (e: PromiseRejectionEvent) =>
      report(e.reason instanceof Error ? `${e.reason.name}: ${e.reason.message}` : String(e.reason), 'unhandledrejection');

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [notify]);

  return null;
}
