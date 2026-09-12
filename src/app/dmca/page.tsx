import type { Metadata } from 'next';
import { ReportForm } from '@/components/ReportForm';

export const metadata: Metadata = { title: 'DMCA & Copyright' };

export default function DmcaPage() {
  const dmca = process.env.DMCA_CONTACT_EMAIL || 'legal@nekomo.example';
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">DMCA &amp; Copyright</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
        <p>
          Nekomo only embeds video it owns, licenses, or has explicit permission to show.
          We do not host, mirror, scrape, or link to unauthorized streams, and we respond to
          valid takedown notices.
        </p>
        <p>
          If you are a rights holder (or authorized agent) and believe content on Nekomo
          infringes your copyright, submit a notice below or email{' '}
          <a href={`mailto:${dmca}`} className="text-rose-light hover:underline">
            {dmca}
          </a>
          .
        </p>
        <p>
          Include: identification of the work, where it appears on Nekomo, your contact
          details, and a good-faith statement that the use is unauthorized.
        </p>
      </div>
      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Submit a copyright notice</h2>
        <ReportForm kind="copyright" showAnimeField submitLabel="Submit notice" />
      </div>
    </div>
  );
}
