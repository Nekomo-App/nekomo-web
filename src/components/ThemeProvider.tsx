'use client';

import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DEFAULT_THEME, useStore, type ThemeSettings } from '@/lib/store';

const FONT_SCALE: Record<ThemeSettings['fontSize'], string> = {
  small: '14.5px',
  medium: '16px',
  large: '17.5px',
};

/** Applies theme tokens to <html> and wires framer-motion's reduced motion. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const [systemLight, setSystemLight] = useState(false);

  // Track OS preference for mode: 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => setSystemLight(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const t = { ...DEFAULT_THEME, ...theme };
    const resolved = t.mode === 'system' ? (systemLight ? 'light' : 'dark') : t.mode;
    el.dataset.theme = resolved;
    el.dataset.accent = t.accent;
    el.dataset.bg = t.bg;
    el.dataset.card = t.card;
    el.dataset.density = t.density;
    el.dataset.blur = t.blur ? 'on' : 'off';
    el.dataset.motion = reducedMotion || !t.animations ? 'reduced' : 'full';
    el.style.setProperty('--font-scale', FONT_SCALE[t.fontSize]);
  }, [theme, reducedMotion, systemLight]);

  const motionReduced = reducedMotion || !theme.animations;

  return (
    <MotionConfig reducedMotion={motionReduced ? 'always' : 'user'}>{children}</MotionConfig>
  );
}
