'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { toast } from '@/components/Toaster';
import { Logo } from '@/components/Logo';

type Mode = 'signin' | 'register' | 'reset';
type Stage = 'puzzle' | 'auth' | 'disclaimer';

const TABS: { id: Mode; label: string }[] = [
  { id: 'signin', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
  { id: 'reset', label: 'Reset password' },
];

const inputCls =
  'w-full rounded-xl border border-line bg-bg-alt px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-rose focus:shadow-glow-sm focus:outline-none';

/** Only allow same-origin relative redirects (open-redirect protection). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [mode, setMode] = useState<Mode>('signin');
  const [stage, setStage] = useState<Stage>('puzzle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const disclaimerAccepted = useStore((s) => s.disclaimerAccepted);
  const acceptDisclaimer = useStore((s) => s.acceptDisclaimer);
  const oauthHandled = useRef(false);

  // Returning from AniList OAuth — pick up the server session.
  useEffect(() => {
    if (oauthHandled.current) return;
    const err = params.get('error');
    if (err === 'oauth-not-configured') toast('AniList sign-in is not configured on this deployment', 'error');
    else if (err === 'oauth-state') toast('Sign-in check failed — try again', 'error');
    else if (err === 'oauth-failed') toast('AniList sign-in failed — try again', 'error');
    if (err) oauthHandled.current = true;

    if (params.get('oauth') !== 'done') return;
    oauthHandled.current = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) return;
        setProfile({ name: d.user.name, avatar: d.user.avatar, provider: 'anilist' });
        toast(`Welcome, ${d.user.name}`, 'success');
        if (useStore.getState().disclaimerAccepted) router.push(next);
        else setStage('disclaimer');
      })
      .catch(() => {});
  }, [params, next, router, setProfile]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode !== 'reset' && !password) e.password = 'Password is required';
    else if (mode !== 'reset' && password.length < 6) e.password = 'At least 6 characters';
    if (mode === 'register' && !name.trim()) e.name = 'Display name is required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (mode === 'reset') {
      toast('If an account existed, a reset link would be on its way. (Demo build — no emails are sent.)', 'info');
      setMode('signin');
      return;
    }
    setProfile({ name: name.trim() || email.split('@')[0], email, provider: 'local' });
    toast(mode === 'register' ? 'Account created — welcome!' : 'Signed in', 'success');
    if (disclaimerAccepted) router.push(next);
    else setStage('disclaimer');
  };

  const signOut = () => {
    if (profile?.provider === 'anilist') {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    setProfile(null);
    toast('Signed out', 'info');
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:px-6">
      <Logo size={44} />
      <h1 className="mt-4 font-display text-2xl font-bold">
        {hydrated && profile ? 'Your account' : 'Welcome to Nekomo'}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-muted">
        {hydrated && profile
          ? `Signed in as ${profile.email || profile.name}`
          : 'Sign in with AniList to sync your list, or create a local profile stored on this device.'}
      </p>

      {hydrated && profile ? (
        <div className="mt-8 w-full space-y-3 rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Name</span>
            <span className="flex items-center gap-2 font-medium">
              {profile.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="" className="h-6 w-6 rounded-full" />
              )}
              {profile.name}
            </span>
          </div>
          {profile.email && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Email</span>
              <span className="font-medium">{profile.email}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Account</span>
            <span className="font-medium">
              {profile.provider === 'anilist' ? 'AniList' : 'Local profile'}
            </span>
          </div>
          <button
            onClick={() => router.push(next)}
            className="mt-2 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
          >
            Continue to Nekomo
          </button>
          <button
            onClick={signOut}
            className="w-full rounded-xl border border-danger/40 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            Sign out
          </button>
        </div>
      ) : stage === 'puzzle' ? (
        <HumanCheck onPass={() => setStage('auth')} />
      ) : stage === 'disclaimer' ? (
        <Disclaimer
          onAccept={() => {
            acceptDisclaimer();
            router.push(next);
          }}
        />
      ) : (
        <>
          {/* Real account sign-in — your AniList list and progress sync. */}
          <a
            href={`/api/auth/anilist?next=${encodeURIComponent(next)}`}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#02a9ff] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0290db]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.36 18.59 4.88 17.1l7.34-7.34c.4-.4 1.05-.4 1.45 0l.01.01c.4.4.4 1.05 0 1.45l-7.32 7.37zM12 3a9 9 0 1 0 9 9h-2.98A6.03 6.03 0 0 1 12 18.03 6.03 6.03 0 0 1 5.97 12 6.03 6.03 0 0 1 12 5.97V3zm0 7.58a1.42 1.42 0 1 0 0 2.84 1.42 1.42 0 0 0 0-2.84z"/>
            </svg>
            Sign in with AniList
          </a>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Real account — syncs your watching list and progress.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs text-ink-muted" role="separator">
            <span className="h-px flex-1 bg-line" />
            or use a local profile
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="mt-4 w-full rounded-2xl border border-line bg-card p-6">
          <div role="tablist" className="mb-6 flex gap-1 rounded-xl bg-bg-alt p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={mode === t.id}
                onClick={() => {
                  setMode(t.id);
                  setErrors({});
                }}
                className={`relative min-h-[44px] flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === t.id ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {mode === t.id && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-rose/25"
                    transition={{ duration: 0.25 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                  Display name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. neko_fan"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>
            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-rose py-3.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:bg-rose-mid hover:shadow-glow"
            >
              {mode === 'signin' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
            </button>
          </form>
          </div>
        </>
      )}
    </div>
  );
}

/** Simple math puzzle — a friendly bot check, not a security control. */
function HumanCheck({ onPass }: { onPass: () => void }) {
  const [a] = useState(() => 2 + Math.floor(Math.random() * 7));
  const [b] = useState(() => 1 + Math.floor(Math.random() * 8));
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(answer) === a + b) {
      setWrong(false);
      onPass();
    } else {
      setWrong(true);
      setAnswer('');
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 w-full rounded-2xl border border-line bg-card p-6 text-center"
    >
      <p className="font-display text-sm font-semibold">Quick human check</p>
      <p className="mt-1 text-xs text-ink-muted">
        Just so we know you're not a bot — no CAPTCHA farm required.
      </p>
      <label htmlFor="puzzle" className="mt-5 block font-display text-2xl font-bold">
        What is {a} + {b}?
      </label>
      <input
        id="puzzle"
        type="number"
        inputMode="numeric"
        required
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className={`${inputCls} mx-auto mt-3 max-w-[140px] text-center text-lg`}
        aria-describedby={wrong ? 'puzzle-error' : undefined}
      />
      {wrong && (
        <p id="puzzle-error" role="alert" className="mt-2 text-xs text-danger">
          Not quite — try again.
        </p>
      )}
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
      >
        Continue
      </button>
    </form>
  );
}

/** Post-sign-in legal/disclaimer window — one-time acceptance, persisted. */
function Disclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 w-full rounded-2xl border border-line bg-card p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <h2 id="disclaimer-title" className="font-display text-lg font-bold">
        Before you dive in
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Nekomo is an original <strong className="text-ink">demo web project</strong> — not
          affiliated with or linked to any app or existing platform.
        </li>
        <li>
          We only ever embed video we own, license, or have explicit permission to show. No
          unauthorized streams, ever — see the{' '}
          <a href="/dmca" className="text-rose-light hover:underline">
            DMCA &amp; copyright policy
          </a>
          .
        </li>
        <li>
          For your privacy and safety, we recommend browsing with a VPN and/or a DNS-level ad
          blocker.
        </li>
        <li>Your watchlist, history, and settings live on this device — no server account.</li>
      </ul>
      <button
        onClick={onAccept}
        className="mt-5 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
      >
        I understand — continue
      </button>
    </motion.div>
  );
}
