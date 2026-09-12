'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { DEFAULT_THEME, useHydrated, useStore, type ThemeSettings } from '@/lib/store';
import { LANGS, useT, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toaster';
import { Poster } from '@/components/Poster';
import { SubBadge, DubBadge } from '@/components/Badges';
import { Logo } from '@/components/Logo';

const ACCENTS: { id: ThemeSettings['accent']; label: string; swatch: string }[] = [
  { id: 'pink', label: 'Sakura Pink', swatch: '#D92B83' },
  { id: 'violet', label: 'Violet', swatch: '#8B5CF6' },
  { id: 'cyan', label: 'Cyan', swatch: '#22D3EE' },
  { id: 'magenta', label: 'Magenta', swatch: '#D946EF' },
  { id: 'blue', label: 'Blue', swatch: '#3B82F6' },
];

export default function SettingsPage() {
  const hydrated = useHydrated();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const resetTheme = useStore((s) => s.resetTheme);
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const t = { ...DEFAULT_THEME, ...theme };
  const i = useT();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{i('settings.title')}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {i('settings.subtitle')}
        {!hydrated && ' Loading…'}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title={i('settings.language')} hint={i('settings.languageHint')}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={i('settings.language')}>
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  role="radio"
                  aria-checked={language === l.id}
                  onClick={() => setLanguage(l.id as Lang)}
                  className={cn(
                    'min-h-[44px] rounded-full border px-4 py-2 text-sm transition-colors',
                    language === l.id
                      ? 'border-rose bg-rose/15 text-ink shadow-glow-sm'
                      : 'border-line text-ink-muted hover:border-rose/50',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title={i('settings.themeMode')}>
            <Segmented
              value={t.mode}
              onChange={(v) => setTheme({ mode: v as ThemeSettings['mode'] })}
              options={[
                ['dark', 'Dark'],
                ['light', 'Light'],
                ['system', 'System'],
              ]}
            />
          </Section>

          <Section title={i('settings.accent')}>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent color">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={t.accent === a.id}
                  onClick={() => setTheme({ accent: a.id })}
                  className={cn(
                    'flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all',
                    t.accent === a.id
                      ? 'border-rose bg-rose/15 text-ink shadow-glow-sm'
                      : 'border-line text-ink-muted hover:border-rose/50',
                  )}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: a.swatch }} />
                  {a.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title={i('settings.background')} hint="AMOLED uses pure black — great for OLED screens.">
            <Segmented
              value={t.bg}
              onChange={(v) => setTheme({ bg: v as ThemeSettings['bg'] })}
              options={[
                ['default', 'Default'],
                ['deep', 'Deep'],
                ['amoled', 'AMOLED'],
              ]}
            />
          </Section>

          <Section title={i('settings.cardStyle')}>
            <Segmented
              value={t.card}
              onChange={(v) => setTheme({ card: v as ThemeSettings['card'] })}
              options={[
                ['default', 'Rounded'],
                ['flat', 'Flat'],
                ['glass', 'Glass'],
              ]}
            />
          </Section>

          <Section title={i('settings.density')}>
            <Segmented
              value={t.density}
              onChange={(v) => setTheme({ density: v as ThemeSettings['density'] })}
              options={[
                ['comfortable', 'Comfortable'],
                ['compact', 'Compact'],
              ]}
            />
          </Section>

          <Section title={i('settings.fontSize')}>
            <Segmented
              value={t.fontSize}
              onChange={(v) => setTheme({ fontSize: v as ThemeSettings['fontSize'] })}
              options={[
                ['small', 'Small'],
                ['medium', 'Medium'],
                ['large', 'Large'],
              ]}
            />
          </Section>

          <Section title={i('settings.motion')}>
            <div className="space-y-3">
              <Toggle
                label="Interface animations"
                description="Transitions, card hover effects, entrance animations"
                checked={t.animations}
                onChange={(v) => setTheme({ animations: v })}
              />
              <Toggle
                label="Reduced motion"
                description="Minimize all nonessential motion (also follows your OS setting)"
                checked={t.reducedMotion}
                onChange={(v) => setTheme({ reducedMotion: v })}
              />
              <Toggle
                label="Blur & transparency"
                description="Glassmorphism on sticky header, menus, and overlays"
                checked={t.blur}
                onChange={(v) => setTheme({ blur: v })}
              />
            </div>
          </Section>

          <button
            onClick={() => {
              resetTheme();
              toast('Theme reset to defaults', 'success');
            }}
            className="min-h-[44px] rounded-xl border border-danger/40 px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            {i('settings.reset')}
          </button>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {i('settings.preview')}
          </h2>
          <motion.div layout className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex gap-3 p-4">
              <div className="w-20 shrink-0 overflow-hidden rounded-xl border border-line">
                <Poster title="Preview Title" artHue={330} className="aspect-[2/3]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <SubBadge />
                  <DubBadge />
                </div>
                <p className="mt-1.5 font-display text-sm font-bold leading-tight">
                  Sample Anime Title
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">2026 · TV · ★ 8.4</p>
                <p className="clamp-2 mt-1.5 text-xs leading-relaxed text-ink-muted">
                  A short synopsis shows how body text and muted colors look with this theme.
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-line p-4">
              <span className="rounded-full bg-rose px-4 py-1.5 text-xs font-semibold text-white">
                Primary
              </span>
              <span className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink">
                Secondary
              </span>
            </div>
          </motion.div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card p-3 text-xs text-ink-muted">
            <Logo size={24} />
            <span>Brand mark stays consistent across themes.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card/60 p-5">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const uid = useId();
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-bg-alt p-1" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'relative min-h-[40px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            value === v ? 'text-white' : 'text-ink-muted hover:text-ink',
          )}
        >
          {value === v && (
            <motion.span
              layoutId={`seg-${uid}`}
              className="absolute inset-0 rounded-lg bg-rose/25"
              transition={{ duration: 0.2 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors',
          checked ? 'bg-rose' : 'bg-line',
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            'block h-5 w-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  );
}
