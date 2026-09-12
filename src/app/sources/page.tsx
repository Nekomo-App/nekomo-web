import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublicSources, toPublicSource } from '@/lib/admin/store';
import { SourcesDirectory } from '@/components/SourcesDirectory';
import { SubmitSourceForm } from '@/components/SubmitSourceForm';

export const metadata: Metadata = {
  title: 'Sources',
  description: 'The catalog of sources Nekomo uses — official, open, community, and user-submitted — with live status.',
};

export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  const sources = listPublicSources().map(toPublicSource);
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Sources</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Nekomo is an open-source catalog project — it does not host media. Every source is
            labeled by category and checked for health. Non-official and custom sources are
            user/third-party services shown for transparency; you are responsible for how you use
            them. See our{' '}
            <Link href="/terms" className="text-rose-light hover:underline">Terms of Use</Link> and{' '}
            <Link href="/privacy" className="text-rose-light hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        <SubmitSourceForm />
      </div>
      <div className="mt-6">
        <SourcesDirectory sources={sources} />
      </div>
    </div>
  );
}
