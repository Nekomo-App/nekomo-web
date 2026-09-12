'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toaster';
import { IntegrationsPanel } from '@/components/admin/IntegrationsPanel';
import type { StoredReport } from '@/lib/reports';
import { githubIssueUrl, type ErrorEntry } from '@/lib/errors';

type Tab = 'overview' | 'reports' | 'sources' | 'apis' | 'errors' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reports', label: 'Reports' },
  { id: 'sources', label: 'Sources' },
  { id: 'apis', label: 'APIs' },
  { id: 'errors', label: 'Errors' },
  { id: 'audit', label: 'Audit log' },
];

interface Health {
  uptimeSec: number;
  node: string;
  env: string;
  version: string;
  memoryMb: number;
  cache: { size: number; max: number };
  flags: Record<string, boolean>;
  integrations: { total: number; healthy: number; degraded: number; down: number; unknown: number };
  config: Record<string, boolean>;
  database: string;
  workers: string;
  storage: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setHealth(await res.json());
      setHealthError(false);
    } catch {
      setHealthError(true);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const iv = setInterval(loadHealth, 30_000);
    return () => clearInterval(iv);
  }, [loadHealth]);

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Manage Nekomo integrations, reports, and system state.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/developer"
            className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-ink"
          >
            Developer tools
          </Link>
          <button
            onClick={logout}
            className="min-h-[40px] rounded-xl border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-bg-alt p-1" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              'min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-rose/25 text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && <Overview health={health} error={healthError} onRetry={loadHealth} />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'sources' && <IntegrationsPanel kind="source" />}
        {tab === 'apis' && <IntegrationsPanel kind="api" />}
        {tab === 'errors' && <ErrorsPanel />}
        {tab === 'audit' && <AuditPanel />}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({
  health,
  error,
  onRetry,
}: {
  health: Health | null;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <EmptyState
        title="Health check failed"
        body="The health endpoint returned an error."
        action={<RetryButton onClick={onRetry} />}
      />
    );
  }
  if (!health) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const stats: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' }[] = [
    { label: 'Uptime', value: fmtUptime(health.uptimeSec) },
    { label: 'Version', value: `v${health.version} · ${health.env}` },
    { label: 'Memory', value: `${health.memoryMb} MB` },
    { label: 'Cache', value: `${health.cache.size}/${health.cache.max} entries` },
    {
      label: 'Integrations healthy',
      value: `${health.integrations.healthy}/${health.integrations.total}`,
      tone: health.integrations.down ? 'bad' : health.integrations.degraded ? 'warn' : 'ok',
    },
    { label: 'Degraded', value: String(health.integrations.degraded), tone: health.integrations.degraded ? 'warn' : undefined },
    { label: 'Down', value: String(health.integrations.down), tone: health.integrations.down ? 'bad' : undefined },
    { label: 'Node', value: health.node },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-muted">{s.label}</p>
            <p
              className={cn(
                'mt-1 font-display text-xl font-bold',
                s.tone === 'ok' && 'text-success',
                s.tone === 'warn' && 'text-warn',
                s.tone === 'bad' && 'text-danger',
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Infrastructure
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Database" v={health.database} />
            <Row k="Storage" v={health.storage} />
            <Row k="Workers / queue" v={health.workers} />
          </dl>
        </section>
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Configuration
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {Object.entries(health.config).map(([k, v]) => (
              <Row
                key={k}
                k={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                v={v ? 'Set' : 'Not set'}
                tone={v ? 'ok' : 'bad'}
              />
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-muted">{k}</dt>
      <dd className={cn(tone === 'ok' && 'text-success', tone === 'bad' && 'text-warn')}>{v}</dd>
    </div>
  );
}

function fmtUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

/* ---------------- Reports ---------------- */

function ReportsPanel() {
  const [reports, setReports] = useState<StoredReport[] | null>(null);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const load = useCallback(async () => {
    const res = await fetch('/api/report', { cache: 'no-store' });
    setReports(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string) {
    const res = await fetch(`/api/report?id=${encodeURIComponent(id)}`, { method: 'PATCH' });
    if (res.ok) {
      toast('Report resolved', 'success');
      load();
    } else {
      toast('Failed to resolve report', 'error');
    }
  }

  const shown = (reports ?? []).filter((r) =>
    filter === 'all' ? true : filter === 'open' ? !r.resolved : r.resolved,
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-bg-alt p-1">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'min-h-[36px] rounded-md px-3 py-1.5 text-sm capitalize',
                filter === f ? 'bg-rose/25 text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:text-ink">
          Refresh
        </button>
      </div>
      {!reports ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState title="No reports" body={`No ${filter === 'all' ? '' : filter + ' '}reports.`} />
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose/15 px-2.5 py-0.5 text-xs font-medium text-rose-light">
                      {r.kind}
                    </span>
                    <span className={cn('text-xs', r.resolved ? 'text-success' : 'text-warn')}>
                      {r.resolved ? 'Resolved' : 'Open'}
                    </span>
                    <time className="text-xs text-ink-muted">{new Date(r.at).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{r.message}</p>
                  {(r.name || r.email) && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {[r.name, r.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {!r.resolved && (
                  <button
                    onClick={() => resolve(r.id)}
                    className="min-h-[40px] shrink-0 rounded-lg bg-success/15 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/25"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Errors ---------------- */

function ErrorsPanel() {
  const [errors, setErrors] = useState<ErrorEntry[] | null>(null);
  const [source, setSource] = useState<'all' | string>('all');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/errors', { cache: 'no-store' });
    setErrors(res.ok ? (await res.json()).errors : []);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [load]);

  async function clearAll() {
    if (!confirm('Clear the entire error log?')) return;
    const res = await fetch('/api/admin/errors', { method: 'DELETE' });
    if (res.ok) {
      toast('Error log cleared', 'success');
      load();
    } else {
      toast('Failed to clear log', 'error');
    }
  }

  function copyReport(e: ErrorEntry) {
    const text = [
      `[${e.source}] ${e.context ?? ''} @ ${e.at}`,
      e.url ? `page: ${e.url}` : null,
      e.status !== undefined ? `status: ${e.status}` : null,
      e.message,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast('Report copied', 'success'),
      () => toast('Copy failed', 'error'),
    );
  }

  const sources = Array.from(new Set((errors ?? []).map((e) => e.source)));
  const shown = (errors ?? []).filter((e) => source === 'all' || e.source === source);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-bg-alt p-1">
          {['all', ...sources].map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'min-h-[36px] rounded-md px-3 py-1.5 text-sm capitalize',
                source === s ? 'bg-rose/25 text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:text-ink">
            Refresh
          </button>
          <button
            onClick={clearAll}
            className="min-h-[36px] rounded-lg border border-danger/40 px-3 text-sm text-danger hover:bg-danger/10"
          >
            Clear log
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-ink-muted">
        In-memory log — resets on redeploy/serverless cold starts. Use “GitHub” to file an issue
        on the Nekomo repo with the report prefilled.
      </p>
      {!errors ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState title="No errors" body="Nothing logged — everything is healthy." />
      ) : (
        <ul className="space-y-3">
          {shown.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        e.source === 'client' ? 'bg-rose/15 text-rose-light' : 'bg-danger/15 text-danger',
                      )}
                    >
                      {e.source}
                    </span>
                    {e.context && <span className="font-mono text-xs text-ink-muted">{e.context}</span>}
                    <time className="text-xs text-ink-muted">{new Date(e.at).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 break-words font-mono text-xs leading-relaxed text-ink">{e.message}</p>
                  {e.url && <p className="mt-1 text-xs text-ink-muted">page: {e.url}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => copyReport(e)}
                    className="min-h-[36px] rounded-lg border border-line px-3 text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Copy
                  </button>
                  <a
                    href={githubIssueUrl(e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[36px] rounded-lg border border-line px-3 py-2 text-xs text-rose-light transition-colors hover:border-rose"
                  >
                    GitHub ↗
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Audit ---------------- */

interface AuditEntry {
  ts: string;
  action: string;
  target?: string;
  detail?: string;
}

function AuditPanel() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    fetch('/api/admin/audit', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries));
  }, []);

  if (!entries) return <div className="skeleton h-64 rounded-2xl" />;
  if (!entries.length) return <EmptyState title="No activity" body="Administrative actions will appear here." />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-line/40 last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{new Date(e.ts).toLocaleString()}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{e.action}</td>
              <td className="max-w-[180px] truncate px-4 py-2.5 text-ink-muted">{e.target ?? '—'}</td>
              <td className="max-w-[240px] truncate px-4 py-2.5 text-ink-muted">{e.detail ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-h-[40px] rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose-mid"
    >
      Retry
    </button>
  );
}
