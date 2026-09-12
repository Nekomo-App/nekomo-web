'use client';

import { MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useStore((s) => s.reducedMotion);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>
  );
}
