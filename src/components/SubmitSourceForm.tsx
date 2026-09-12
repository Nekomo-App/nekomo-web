'use client';

import { useState } from 'react';
import { toast } from '@/components/Toaster';

/** Public "suggest a source" form — submissions land in the admin review queue. */
export function SubmitSourceForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, description }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setDone(true);
      toast('Source submitted for review', 'success');
    } else {
      toast(d.error ?? 'Submission failed', 'error');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-ink"
      >
        Suggest a source
      </button>
    );
  }

  if (done) {
    return (
      <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
        Submitted — an admin will review it before it appears here.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-2xl border border-line bg-card p-5">
      <p className="font-display text-sm font-semibold">Suggest a source</p>
      <p className="text-xs text-ink-muted">
        Submissions are reviewed before listing and are always labeled Custom and Unverified.
      </p>
      <input
        required
        minLength={2}
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Source name"
        aria-label="Source name"
        className={inp}
      />
      <input
        required
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        aria-label="Source URL"
        className={inp}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What does it provide? (optional)"
        aria-label="Description"
        rows={2}
        maxLength={500}
        className={inp}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="min-h-[40px] rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose-mid disabled:opacity-60">
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inp =
  'min-h-[40px] w-full rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose';
