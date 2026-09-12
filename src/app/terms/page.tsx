import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of Use' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Terms of Use</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
        <p>
          Nekomo is an open-source catalog and discovery project. By using it you agree to these
          terms.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">What Nekomo is</h2>
        <p>
          Nekomo indexes anime metadata and maintains a directory of viewing sources. It does not
          host media files. Built-in playable streams are limited to content Nekomo owns, licenses,
          or has permission to embed.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Third-party sources</h2>
        <p>
          Sources labeled <em>Community</em>, <em>Non-Official</em>, or <em>Custom</em> are
          third-party services. They are clearly labeled, are not endorsed by Nekomo, and are marked
          Unverified unless an administrator has confirmed them. You are responsible for how you use
          them and for complying with their terms and applicable law.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Acceptable use</h2>
        <p>
          Do not abuse the service, submit unlawful content, or misrepresent sources you suggest.
          Administrators may reject, disable, or remove any source at their discretion.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Copyright</h2>
        <p>
          Rights holders can submit takedown notices via the{' '}
          <Link href="/dmca" className="text-rose-light hover:underline">DMCA &amp; Copyright</Link>{' '}
          page. See also the{' '}
          <Link href="/privacy" className="text-rose-light hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
