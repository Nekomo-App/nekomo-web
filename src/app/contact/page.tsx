import type { Metadata } from 'next';
import Link from 'next/link';
import { ReportForm } from '@/components/ReportForm';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Contact</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Questions, feedback, or partnership inquiries — we read everything.
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        Copyright or rights-holder issue? Use the{' '}
        <Link href="/dmca" className="text-rose-light hover:underline">DMCA &amp; copyright page</Link>.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <ReportForm kind="contact" submitLabel="Send message" />
      </div>
    </div>
  );
}
