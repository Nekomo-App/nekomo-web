'use client';

// Lightweight toast system — `toast('...')` from anywhere client-side.

import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(message: string, kind: Toast['kind'] = 'info') {
  useToastStore.getState().push({ message, kind });
}

const ICONS: Record<Toast['kind'], React.ReactNode> = {
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  ),
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[90] flex w-72 flex-col gap-2 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm shadow-lg glass ${
              t.kind === 'success'
                ? 'text-success'
                : t.kind === 'error'
                  ? 'text-danger'
                  : 'text-ink'
            }`}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.kind]}</span>
            <span className="text-ink">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
