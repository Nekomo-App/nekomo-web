'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function AdminLogin() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.status === 429 ? 'Too many attempts — wait a minute.' : 'Invalid admin key.');
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Logo size={44} />
      <h1 className="mt-4 font-display text-2xl font-bold">Admin access</h1>
      <p className="mt-1 text-center text-sm text-ink-muted">
        This area is restricted. Enter your administrator key to continue.
      </p>
      <form onSubmit={submit} className="mt-6 w-full space-y-3">
        <label htmlFor="admin-key" className="sr-only">
          Admin key
        </label>
        <input
          id="admin-key"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          required
          className="min-h-[44px] w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose"
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] w-full rounded-xl bg-rose py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-mid disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-muted">
        Configure with <code className="rounded bg-card px-1">ADMIN_KEY</code> in your environment.
      </p>
    </div>
  );
}
