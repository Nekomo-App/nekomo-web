'use client';

import { useState } from 'react';
import { toast } from './Toaster';

const inputCls =
  'w-full rounded-xl border border-line bg-bg-alt px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-rose focus:shadow-glow-sm focus:outline-none';

/** Shared responsive form for DMCA / copyright / contact submissions. */
export function ReportForm({
  kind,
  showAnimeField,
  submitLabel,
}: {
  kind: 'copyright' | 'contact';
  showAnimeField?: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [animeId, setAnimeId] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email';
    if (message.trim().length < 10) errs.message = 'Please describe the issue (10+ characters)';
    if (kind === 'copyright' && !name.trim()) errs.name = 'Your legal name is required for notices';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, email, animeId: animeId || undefined, message }),
      });
      if (!res.ok) throw new Error();
      toast('Submitted — we\'ll review it shortly', 'success');
      setName(''); setEmail(''); setAnimeId(''); setMessage(''); setErrors({});
    } catch {
      toast('Submission failed — try again', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rf-name" className="mb-1.5 block text-sm font-medium">
            Name{kind === 'copyright' ? ' (legal)' : ''}
          </label>
          <input
            id="rf-name" type="text" autoComplete="name"
            value={name} onChange={(e) => setName(e.target.value)}
            className={inputCls} placeholder="Your name"
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="rf-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="rf-email" type="email" autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className={inputCls} placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
        </div>
      </div>
      {showAnimeField && (
        <div>
          <label htmlFor="rf-anime" className="mb-1.5 block text-sm font-medium">
            Affected title ID <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="rf-anime" type="text"
            value={animeId} onChange={(e) => setAnimeId(e.target.value)}
            className={inputCls} placeholder="e.g. loc-starlight-strays or a MAL id"
          />
        </div>
      )}
      <div>
        <label htmlFor="rf-msg" className="mb-1.5 block text-sm font-medium">
          {kind === 'copyright' ? 'Description of the copyrighted work and location' : 'Message'}
        </label>
        <textarea
          id="rf-msg" rows={6} maxLength={2000}
          value={message} onChange={(e) => setMessage(e.target.value)}
          className={inputCls}
          placeholder={
            kind === 'copyright'
              ? 'Identify the work, where it appears on Nekomō, and confirm you are the rights holder or authorized agent…'
              : 'How can we help?'
          }
        />
        {errors.message && <p className="mt-1 text-xs text-danger">{errors.message}</p>}
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-rose py-3.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:bg-rose-mid disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {sending ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
