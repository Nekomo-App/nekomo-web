import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { displayStatus, getIntegration, toPublicSource } from '@/lib/admin/store';
import { STATUS_STYLE, STATUS_TEXT } from '@/components/SourcesDirectory';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = getIntegration(params.id);
  const visible = item && !item.deletedAt && item.enabled && item.reviewState === 'approved';
  return { title: visible ? `Source: ${item.name}` : 'Source' };
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : 'never');

export default function SourceDetailPage({ params }: { params: { id: string } }) {
  const item = getIntegration(params.id);
  if (!item || item.deletedAt || !item.enabled || item.reviewState !== 'approved') notFound();
  const s = toPublicSource(item);
  const status = displayStatus(item);
  const isUnofficial = s.category === 'non-official' || s.category === 'custom';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-ink-muted" aria-label="Breadcrumb">
        <Link href="/sources" className="hover:text-rose-light">Sources</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{s.name}</span>
      </nav>

      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex items-start gap-4">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-alt font-display text-xl font-bold text-rose-light">
              {s.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{s.name}</h1>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>
                {STATUS_TEXT[status] ?? status}
              </span>
              <span className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">{s.label}</span>
              {!s.verified && (
                <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Unverified</span>
              )}
            </div>
            {s.maintainer && <p className="mt-1 text-sm text-ink-muted">Maintained by {s.maintainer}</p>}
          </div>
        </div>

        {isUnofficial && (
          <p className="mt-4 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn" role="note">
            This is a {s.label.toLowerCase()} source — not operated by, affiliated with, licensed by,
            or endorsed by Nekomo. It is unverified; you are responsible for how you use it.
          </p>
        )}

        {s.description && <p className="mt-4 text-sm leading-relaxed text-ink-muted">{s.description}</p>}

        <dl className="mt-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Row k="Type" v={s.type} />
          <Row k="Kind" v={s.kind === 'api' ? 'API' : 'Source'} />
          <Row k="Website" v={<ExtLink url={s.baseUrl} />} mono />
          {s.docsUrl && <Row k="API / docs" v={<ExtLink url={s.docsUrl} />} mono />}
          <Row k="Features" v={s.features.join(', ') || '—'} />
          <Row k="Languages" v={s.languages.join(', ') || '—'} />
          <Row k="Regions" v={s.regions.join(', ') || 'Worldwide'} />
          <Row
            k="License"
            v={s.verified ? 'Reviewed by Nekomo admins' : 'Not confirmed — unverified'}
          />
          <Row k="Status" v={STATUS_TEXT[status] ?? status} />
          <Row k="Last check" v={fmt(s.health.lastCheckAt)} />
          <Row k="Last successful check" v={fmt(s.health.lastOk)} />
          <Row k="Response time" v={s.health.latencyMs != null ? `${s.health.latencyMs}ms` : '—'} />
          <Row k="Added" v={fmt(s.createdAt)} />
          <Row k="Last updated" v={fmt(s.updatedAt)} />
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={s.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-mid"
          >
            Visit site ↗
          </a>
          {s.legal.terms && <LegalLink url={s.legal.terms} label="Terms of use" />}
          {s.legal.privacy && <LegalLink url={s.legal.privacy} label="Privacy policy" />}
          {s.legal.dmca && <LegalLink url={s.legal.dmca} label="Copyright / DMCA" />}
          <Link
            href="/dmca"
            className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-ink"
          >
            Report a copyright issue
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/40 pb-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className={cn('text-right font-medium', mono && 'break-all font-mono text-xs')}>{v}</dd>
    </div>
  );
}

function ExtLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-rose-light hover:underline">
      {url.replace(/^https?:\/\//, '')} ↗
    </a>
  );
}

function LegalLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-rose hover:text-ink"
    >
      {label} ↗
    </a>
  );
}
