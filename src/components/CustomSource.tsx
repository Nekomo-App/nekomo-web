'use client';

import { useState } from 'react';

/**
 * Custom source — play a video URL the user supplies (e.g. a file from their
 * own Jellyfin server or a video they have rights to). Never prefetches or
 * proxies the URL; it goes straight into the user's own video element.
 */
export function CustomSource() {
  const [input, setInput] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');

  const play = () => {
    const raw = input.trim();
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
      setActive(raw);
      setError('');
    } catch {
      setError('Enter a valid http(s) URL — e.g. a direct video file or stream link.');
      setActive(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-line bg-card/50 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Your own source
      </h3>
      {active ? (
        <div>
          <video src={active} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
          <button
            onClick={() => {
              setActive(null);
              setInput('');
            }}
            className="mt-2 text-xs text-ink-muted underline-offset-2 hover:text-white hover:underline"
          >
            Use a different URL
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            play();
          }}
        >
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://your-server/video.mp4"
            aria-label="Custom video URL"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-muted/50 focus:border-rose focus:outline-none"
          />
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
          <button
            type="submit"
            className="mt-2 w-full rounded-lg border border-rose bg-rose/15 py-2 text-xs font-semibold text-rose-light transition-colors hover:bg-rose hover:text-white"
          >
            Play custom source
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted/70">
            For media you have the rights to — e.g. files on your own Jellyfin server. You are
            responsible for the sources you add.
          </p>
        </form>
      )}
    </div>
  );
}
