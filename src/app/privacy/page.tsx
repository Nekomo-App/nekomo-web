import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
        <p>
          Nekomo is an open-source catalog project. It is designed to collect as little data as
          possible.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">What stays on your device</h2>
        <p>
          Your watchlist, watch history, episode progress, ratings, theme, and language settings are
          stored in your browser's local storage. They are not sent to or stored on our servers.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Accounts</h2>
        <p>
          If you sign in with AniList, we keep a server-side session cookie (8 hours) so your list
          and progress can sync. You can sign out at any time to clear it. Local profiles never
          leave your device.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Third-party services</h2>
        <p>
          Catalog metadata comes from third-party APIs (Jikan/MyAnimeList, AniList, Kitsu) and
          trailers are embedded from YouTube (youtube-nocookie). Those services see your request for
          that data under their own privacy policies. Sources marked non-official or custom are
          third-party services with their own practices — we make no claims about them.
        </p>
        <h2 className="pt-3 font-display text-lg font-bold text-ink">Reports and submissions</h2>
        <p>
          Reports and source submissions you send are processed to operate the site. Do not include
          personal information you do not want reviewed by administrators.
        </p>
        <p>
          For questions, use the{' '}
          <Link href="/contact" className="text-rose-light hover:underline">contact page</Link>.
        </p>
      </div>
    </div>
  );
}
