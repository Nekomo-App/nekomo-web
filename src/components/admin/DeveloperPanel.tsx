'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toaster';
import { useStore } from '@/lib/store';

interface Health {
  uptimeSec: number;
  node: string;
  env: string;
  version: string;
  memoryMb: number;
  cache: { size: number; max: number };
  flags: Record<string, boolean>;
  config: Record<string, boolean>;
  database: string;
  workers: string;
  storage: string;
}

export function DeveloperPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [confirm, setConfirm] = useState<'cache' | 'maintenance' | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/health', { cache: 'no-store' });
    if (res.ok) setHealth(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setFlag(key: string, value: boolean) {
    const res = await fetch('/api/admin/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    if (res.ok) {
      toast(`${key} ${value ? 'enabled' : 'disabled'}`, 'success');
      load();
    } else {
      toast('Flag update failed', 'error');
    }
  }

  async function clearCache() {
    if (confirm !== 'cache') return setConfirm('cache');
    setConfirm(null);
    const res = await fetch('/api/admin/cache', { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    toast(res.ok ? `Cleared ${data.cleared ?? 0} cache entries` : 'Clear failed', res.ok ? 'success' : 'error');
    load();
  }

  const f = health?.flags ?? {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Developer tools</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Diagnostics and feature flags. Admin-authenticated, audit-logged.
          </p>
        </div>
        <Link
          href="/admin"
          className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink"
        >
          ← Admin
        </Link>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Runtime
          </h2>
          {health ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              <Item k="Version" v={`v${health.version}`} />
              <Item k="Environment" v={health.env} />
              <Item k="Node" v={health.node} />
              <Item k="Uptime" v={`${Math.round(health.uptimeSec / 60)}m`} />
              <Item k="Memory" v={`${health.memoryMb} MB`} />
              <Item k="Cache" v={`${health.cache.size}/${health.cache.max}`} />
            </dl>
          ) : (
            <div className="skeleton mt-3 h-20 rounded-xl" />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Feature flags
          </h2>
          <div className="mt-3 space-y-3">
            <Flag
              label="Maintenance mode"
              description="API routes return 503 while enabled. Use before disruptive work."
              checked={Boolean(f.maintenance)}
              onChange={(v) => setFlag('maintenance', v)}
            />
            <Flag
              label="API request logging"
              description="Log provider requests server-side (no secrets are logged)."
              checked={Boolean(f.apiLogging)}
              onChange={(v) => setFlag('apiLogging', v)}
            />
            <Flag
              label="Debug logging"
              description="Verbose server logs. Disable in production."
              checked={Boolean(f.debugLogging)}
              onChange={(v) => setFlag('debugLogging', v)}
            />
            <Flag
              label="Local fallback catalog"
              description="Serve the bundled catalog when remote providers fail."
              checked={Boolean(f.localFallback)}
              onChange={(v) => setFlag('localFallback', v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Actions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={clearCache}
              className={cn(
                'min-h-[44px] rounded-xl border px-4 py-2 text-sm',
                confirm === 'cache'
                  ? 'border-danger bg-danger/15 text-danger'
                  : 'border-line text-ink-muted hover:border-rose hover:text-ink',
              )}
            >
              {confirm === 'cache' ? 'Confirm clear cache?' : 'Clear response cache'}
            </button>
            <button
              onClick={load}
              className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink"
            >
              Refresh health
            </button>
            <button
              onClick={() => {
                useStore.getState().notify('Test notification', 'Sent from developer tools');
                toast('Test notification sent', 'success');
              }}
              className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink"
            >
              Send test notification
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            All actions are rate-limited, require the admin session, and are written to the audit log.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Environment
          </h2>
          {health ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Item k="Database" v={health.database} />
              <Item k="Storage" v={health.storage} />
              <Item k="Workers" v={health.workers} />
              {Object.entries(health.config).map(([k, v]) => (
                <Item key={k} k={k} v={v ? 'Configured' : 'Not set'} tone={v} />
              ))}
            </dl>
          ) : (
            <div className="skeleton mt-3 h-32 rounded-xl" />
          )}
          <p className="mt-3 text-xs text-ink-muted">
            Values are never shown — only whether each variable is configured.
          </p>
        </section>
      </div>
    </div>
  );
}

function Item({ k, v, tone }: { k: string; v: string; tone?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{k}</dt>
      <dd className={cn(tone === true && 'text-success', tone === false && 'text-warn')}>{v}</dd>
    </div>
  );
}

function Flag({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-rose"
      />
    </label>
  );
}
