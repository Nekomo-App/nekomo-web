'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useHydrated, useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';

/** Notification bell — local notifications (device-only). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const notifications = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationsRead);
  const clearAll = useStore((s) => s.clearNotifications);
  const unread = notifications.filter((n) => !n.read).length;
  const t = useT();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markRead();
        }}
        aria-label={unread ? `${t('nav.notifications')}, ${unread} unread` : t('nav.notifications')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line bg-card p-2.5 text-ink-muted transition-all hover:border-rose hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" strokeLinecap="round" />
        </svg>
        {hydrated && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            role="menu"
            className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-card shadow-glow-sm"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">{t('nav.notifications')}</p>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-ink-muted transition-colors hover:text-danger"
                >
                  {t('nav.clearAll')}
                </button>
              )}
            </div>
            {!hydrated || notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                {t('nav.emptyNotifications')}
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'border-b border-line/50 px-4 py-3 last:border-0',
                      !n.read && 'bg-rose/5',
                    )}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>}
                    <time className="mt-1 block text-[11px] text-ink-muted">
                      {new Date(n.at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
