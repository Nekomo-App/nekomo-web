import { cn, formatStatus } from '@/lib/utils';

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'AIRING'
      ? 'bg-success/15 text-success'
      : status === 'UPCOMING'
        ? 'bg-warn/15 text-warn'
        : 'bg-ink/10 text-ink-muted';
  return <Badge className={style}>{formatStatus(status)}</Badge>;
}

export function SubBadge() {
  return <Badge className="bg-rose/15 text-rose-light">Sub</Badge>;
}

export function DubBadge() {
  return <Badge className="bg-rose-dark/30 text-rose-light">Dub</Badge>;
}

export function StreamBadge() {
  return <Badge className="bg-success/15 text-success">Official</Badge>;
}

export function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  return (
    <Badge className="bg-card text-warn">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
      </svg>
      {score.toFixed(1)}
    </Badge>
  );
}
