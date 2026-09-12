'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { toast } from '@/components/Toaster';
import { Logo } from '@/components/Logo';

type Mode = 'signin' | 'register' | 'reset';

const TABS: { id: Mode; label: string }[] = [
  { id: 'signin', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
  { id: 'reset', label: 'Reset password' },
];

const inputCls =
  'w-full rounded-xl border border-line bg-bg-alt px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-rose focus:shadow-glow-sm focus:outline-none';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);

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
    setProfile({ name: name.trim() || email.split('@')[0], email });
    toast(mode === 'register' ? 'Account created — welcome!' : 'Signed in locally', 'success');
    router.push('/');
  };

  const signOut = () => {
    setProfile(null);
    toast('Signed out', 'info');
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:px-6">
      <Logo size={44} />
      <h1 className="mt-4 font-display text-2xl font-bold">
        {hydrated && profile ? 'Your account' : 'Welcome to Nekomō'}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-muted">
        {hydrated && profile
          ? `Signed in as ${profile.email}`
          : 'Demo accounts are stored on this device only — nothing is sent to a server.'}
      </p>

      {hydrated && profile ? (
        <div className="mt-8 w-full space-y-3 rounded-2xl border border-line bg-card p-6">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Name</span>
            <span className="font-medium">{profile.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Email</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <button
            onClick={signOut}
            className="mt-4 w-full rounded-xl border border-danger/40 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-8 w-full rounded-2xl border border-line bg-card p-6">
          {/* Mode tabs */}
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
                className={`relative flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
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
      )}
    </div>
  );
}
