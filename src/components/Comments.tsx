'use client';

import { useState } from 'react';
import { useHydrated, useStore } from '@/lib/store';
import { toast } from '@/components/Toaster';

/**
 * Local comments — stored on-device only (no backend yet).
 * A production build should back this with a server + moderation.
 */
export function Comments({ animeId }: { animeId: string }) {
  const hydrated = useHydrated();
  const comments = useStore((s) => s.comments[animeId] ?? []);
  const profile = useStore((s) => s.profile);
  const addComment = useStore((s) => s.addComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const [text, setText] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(animeId, profile?.name ?? 'Anonymous', text);
    setText('');
    toast('Comment posted', 'success');
  }

  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={submit} className="rounded-xl border border-line bg-card/60 p-4">
        <label htmlFor="comment-text" className="sr-only">
          Write a comment
        </label>
        <textarea
          id="comment-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Share your thoughts… (stored on this device)"
          className="w-full resize-none rounded-lg border border-line bg-bg-alt px-3 py-2.5 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            Posting as {hydrated ? profile?.name ?? 'Anonymous' : '…'}
          </p>
          <button
            type="submit"
            disabled={!text.trim()}
            className="min-h-[40px] rounded-lg bg-rose px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-mid disabled:opacity-50"
          >
            Post comment
          </button>
        </div>
      </form>

      {!hydrated ? (
        <div className="skeleton h-20 rounded-xl" />
      ) : comments.length === 0 ? (
        <p className="rounded-xl border border-line bg-card/60 p-6 text-center text-sm text-ink-muted">
          No comments yet — be the first.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-card/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose-light">
                    {c.author.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{c.author}</span>
                  <time className="text-xs text-ink-muted">
                    {new Date(c.at).toLocaleDateString()}
                  </time>
                </div>
                <button
                  onClick={() => deleteComment(animeId, c.id)}
                  aria-label={`Delete comment by ${c.author}`}
                  className="min-h-[36px] rounded-lg px-2 text-xs text-ink-muted transition-colors hover:text-danger"
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
