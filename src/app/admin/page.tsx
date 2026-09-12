'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toaster';
import { cn } from '@/lib/utils';

interface StoredReport {
  id: string;
  kind: string;
  animeId?: string;
  episodeId?: string;
  name?: string;
  email?: string;
  message?: string;
  at: string;
  resolved: boolean;
}

/** Demo admin dashboard — lists reports submitted via /api/report. */
export default function AdminPage() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/report');
      setReports(await res.json());
    } catch {
      toast('Could not load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string) => {
    try {
      const res = await fetch(`/api/report?id=${encodeURIComponent(id)}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setReports((r) => r.map((x) => (x.id === id ? { ...x, resolved: true } : x)));
      toast('Marked resolved', 'success');
    } catch {
      toast('Could not update report', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Demo admin dashboard — broken sources, incorrect info, copyright &amp; contact submissions.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-card text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-rose border-t-transparent" />
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No reports yet.
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className={cn('align-top', r.resolved && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-rose/15 px-2 py-0.5 text-xs font-medium text-rose-light">
                      {r.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.animeId ? (
                      <Link href={`/anime/${r.animeId}`} className="text-rose-light hover:underline">
                        {r.animeId}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {r.episodeId && <span className="text-xs text-ink-muted"> / {r.episodeId}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {r.name || '—'}
                    {r.email && <div>{r.email}</div>}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-ink-muted">
                    <span className="clamp-2">{r.message || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                    {new Date(r.at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.resolved ? (
                      <span className="text-xs text-success">Resolved</span>
                    ) : (
                      <button
                        onClick={() => resolve(r.id)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs transition-colors hover:border-success hover:text-success"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
