'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimeDetails, AuthorizedStream, Episode, StreamingLink } from '@/lib/types';
import { progressKey, useStore } from '@/lib/store';
import { cn, formatTime } from '@/lib/utils';
import { toast } from './Toaster';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  anime,
  episode,
  stream,
  nextEpisodeId,
  fallbackLinks = [],
}: {
  anime: AnimeDetails;
  episode: Episode;
  stream: AuthorizedStream;
  nextEpisodeId?: string;
  fallbackLinks?: StreamingLink[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [controls, setControls] = useState(true);
  const [menu, setMenu] = useState<'none' | 'speed' | 'subs' | 'quality' | 'audio'>('none');
  const [subTrack, setSubTrack] = useState<string>('en');
  const [quality, setQuality] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [holdActive, setHoldActive] = useState(false);
  const [flash, setFlash] = useState<{
    kind: 'seek-back' | 'seek-fwd' | 'play' | 'pause';
    id: number;
  } | null>(null);
  // Survives the <video> remount on source switch — applied on loadeddata.
  const pendingRestore = useRef<{ time: number; playing: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTapAt = useRef(0);
  const holding = useRef(false);
  const preHoldRate = useRef(1);

  const saveProgress = useStore((s) => s.saveProgress);
  const clearProgress = useStore((s) => s.clearProgress);
  const autoplayNext = useStore((s) => s.autoplayNext);
  const setAutoplayNext = useStore((s) => s.setAutoplayNext);
  const saved = useStore((s) => s.progress[progressKey(anime.id, episode.id)]);

  const sources = stream.qualities?.length ? stream.qualities : [{ label: 'Auto', url: stream.url }];

  // Resume saved position
  useEffect(() => {
    const v = videoRef.current;
    if (v && saved && saved.position > 5 && saved.position < (saved.duration || Infinity) - 10) {
      v.currentTime = saved.position;
      toast('Resumed where you left off', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress periodically + on pause
  const persist = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    saveProgress({
      animeId: anime.id,
      episodeId: episode.id,
      episodeNumber: episode.number,
      position: v.currentTime,
      duration: v.duration,
      title: episode.title,
      animeTitle: anime.title,
      poster: anime.poster,
      artHue: anime.artHue,
    });
  }, [anime, episode, saveProgress]);

  useEffect(() => {
    const t = setInterval(() => {
      if (playing) persist();
    }, 5000);
    return () => {
      clearInterval(t);
      persist();
    };
  }, [playing, persist]);

  // Controls auto-hide
  const poke = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControls(false);
    }, 3000);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Skip intro visibility
  useEffect(() => {
    setShowSkip(!!episode.intro && time >= episode.intro.start && time < episode.intro.end);
  }, [time, episode.intro]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'arrowright':
        case 'l':
          v.currentTime += e.key.toLowerCase() === 'l' ? 10 : 5;
          break;
        case 'arrowleft':
        case 'j':
          v.currentTime -= e.key.toLowerCase() === 'j' ? 10 : 5;
          break;
        case 'arrowup':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          v.muted = !v.muted;
          break;
      }
      poke();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poke]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await wrapRef.current?.requestFullscreen();
      try {
        await (
          screen.orientation as ScreenOrientation & {
            lock?: (o: string) => Promise<void>;
          }
        )?.lock?.('landscape');
      } catch {
        /* orientation lock unsupported — fine */
      }
    }
  };

  // Release the landscape lock when fullscreen exits by any means.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) {
        try {
          screen.orientation?.unlock();
        } catch {
          /* noop */
        }
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Flash indicator auto-dismiss
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [flash]);

  const seekBy = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + seconds), v.duration || v.currentTime);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setFlash({ kind: 'play', id: Date.now() });
    } else {
      v.pause();
      setFlash({ kind: 'pause', id: Date.now() });
    }
  }, []);

  // Gesture layer: tap = play/pause, double-tap left/right = ±10s,
  // press-and-hold = 2× speed until released.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      holding.current = true;
      preHoldRate.current = v.playbackRate;
      v.playbackRate = 2;
      setRate(2);
      setHoldActive(true);
    }, 450);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    clearTimeout(holdTimer.current);
    if (holding.current) {
      holding.current = false;
      setHoldActive(false);
      const v = videoRef.current;
      if (v) {
        v.playbackRate = preHoldRate.current;
        setRate(preHoldRate.current);
      }
      return;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    const now = Date.now();
    if (now - lastTapAt.current < 300) {
      clearTimeout(tapTimer.current);
      lastTapAt.current = 0;
      const dir = rect && e.clientX - rect.left < rect.width / 2 ? -1 : 1;
      seekBy(dir * 10);
      setFlash({ kind: dir < 0 ? 'seek-back' : 'seek-fwd', id: now });
    } else {
      lastTapAt.current = now;
      tapTimer.current = setTimeout(togglePlay, 300);
    }
  };

  const onPointerCancel = () => {
    clearTimeout(holdTimer.current);
    if (!holding.current) return;
    holding.current = false;
    setHoldActive(false);
    const v = videoRef.current;
    if (v) {
      v.playbackRate = preHoldRate.current;
      setRate(preHoldRate.current);
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch {
      toast('Picture-in-picture is not supported here', 'error');
    }
  };

  const switchQuality = (i: number) => {
    const v = videoRef.current;
    if (!v || i === quality) return;
    // Changing `quality` remounts <video> via key — stash the position so the
    // onLoadedData handler on the NEW element can restore it.
    pendingRestore.current = { time: v.currentTime, playing: !v.paused };
    setQuality(i);
    setLoadError(false);
  };

  const setSubtitle = (lang: string) => {
    setSubTrack(lang);
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      v.textTracks[i].mode = v.textTracks[i].language === lang ? 'showing' : 'hidden';
    }
  };

  const reportBroken = async () => {
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'broken-source', animeId: anime.id, episodeId: episode.id }),
      });
      toast('Report sent — thank you', 'success');
    } catch {
      toast('Could not send report', 'error');
    }
  };

  const onEnded = () => {
    clearProgress(anime.id, episode.id);
    if (autoplayNext && nextEpisodeId) router.push(`/watch/${anime.id}/${nextEpisodeId}`);
  };

  return (
    <div>
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black"
      onMouseMove={poke}
      onTouchStart={poke}
    >
      <video
        ref={videoRef}
        key={sources[quality]?.url ?? stream.url}
        src={sources[quality]?.url ?? stream.url}
        className="h-full w-full touch-manipulation"
        playsInline
        crossOrigin="anonymous"
        controlsList="nodownload"
        disablePictureInPicture={false}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          persist();
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length) setBufferedEnd(b.end(b.length - 1));
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onEnded={onEnded}
        onError={() => setLoadError(true)}
        onLoadedData={() => {
          const p = pendingRestore.current;
          const v = videoRef.current;
          if (!p || !v) return;
          pendingRestore.current = null;
          v.currentTime = p.time;
          if (p.playing) v.play();
        }}
      >
        {(stream.subtitles ?? []).map((s) => (
          <track
            key={s.lang}
            kind="subtitles"
            src={s.url}
            srcLang={s.lang}
            label={s.label}
            default={s.lang === 'en'}
          />
        ))}
      </video>

      {/* Source label */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-rose-light backdrop-blur">
          {stream.provider} · Licensed
        </span>
      </div>

      {/* Buffering spinner */}
      {buffering && !loadError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-rose border-t-transparent" />
        </div>
      )}

      {/* Playback error → official fallback links */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg-alt/95 p-6 text-center">
          <p className="font-display text-lg font-bold text-danger">This stream failed to load</p>
          <p className="max-w-sm text-sm text-ink-muted">
            The authorized source may be temporarily unavailable. You can retry, or use an
            official platform below.
          </p>
          <button
            onClick={() => {
              setLoadError(false);
              videoRef.current?.load();
            }}
            className="rounded-full bg-rose px-5 py-2 text-sm font-semibold text-white hover:bg-rose-mid"
          >
            Retry
          </button>
          <ul className="flex flex-wrap justify-center gap-2">
            {fallbackLinks.map((l) => (
              <li key={l.platform + l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-line px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-rose hover:text-white"
                >
                  {l.platform} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gesture flash indicators */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0.9, scale: 0.85 }}
            animate={{ opacity: 0, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'pointer-events-none absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 text-white drop-shadow-lg',
              flash.kind === 'seek-back'
                ? 'left-[14%]'
                : flash.kind === 'seek-fwd'
                  ? 'right-[14%]'
                  : 'left-1/2 -translate-x-1/2',
            )}
          >
            {flash.kind === 'seek-back' && (
              <>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6zm.5-6 8.5 6V6z" transform="scale(-1,1) translate(-24,0)" /></svg>
                <span className="text-xs font-semibold">−10s</span>
              </>
            )}
            {flash.kind === 'seek-fwd' && (
              <>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6zm9-12v12l8.5-6z" /></svg>
                <span className="text-xs font-semibold">+10s</span>
              </>
            )}
            {flash.kind === 'play' && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
            {flash.kind === 'pause' && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold-to-speedup badge */}
      {holdActive && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-rose-light backdrop-blur">
          2× speed
        </div>
      )}

      {/* Skip intro — only when verified data exists */}
      <AnimatePresence>
        {showSkip && episode.intro && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = episode.intro!.end;
            }}
            className="absolute bottom-24 right-5 rounded-lg border border-line bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-rose"
          >
            Skip Intro →
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div
        className={cn(
          'vp-controls absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-12',
          controls ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* Seek bar with buffered + played track */}
        <div className="relative h-1.5 w-full">
          <div className="absolute inset-0 rounded-full bg-white/20" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-rose"
            style={{ width: `${duration ? (time / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              const v = videoRef.current;
              if (v) v.currentTime = Number(e.target.value);
            }}
            aria-label="Seek"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-rose"
          />
        </div>

        <div className="mt-2 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => seekBy(-10)}
            aria-label="Back 10 seconds"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-white transition-colors hover:text-rose-light sm:flex"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z" /></svg>
          </button>
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white transition-colors hover:text-rose-light"
          >
            {playing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="Forward 10 seconds"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-white transition-colors hover:text-rose-light sm:flex"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l5 5-5 5V7c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6h2c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8z" /></svg>
          </button>
          {nextEpisodeId && (
            <button
              onClick={() => router.push(`/watch/${anime.id}/${nextEpisodeId}`)}
              aria-label="Next episode"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white transition-colors hover:text-rose-light"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = videoRef.current;
                if (v) v.muted = !v.muted;
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white transition-colors hover:text-rose-light"
            >
              {muted || volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4z" strokeLinejoin="round" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) {
                  v.volume = Number(e.target.value);
                  v.muted = false;
                }
              }}
              aria-label="Volume"
              className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-rose sm:block"
            />
          </div>

          <span className="text-xs tabular-nums text-ink-muted">
            {formatTime(time)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Menus */}
            {stream.subtitles?.length ? (
              <PlayerMenu
                label="Subtitles"
                open={menu === 'subs'}
                onToggle={() => setMenu(menu === 'subs' ? 'none' : 'subs')}
                options={[{ id: 'off', label: 'Off' }, ...stream.subtitles.map((s) => ({ id: s.lang, label: s.label }))]}
                active={subTrack}
                onSelect={(id) => (id === 'off' ? setSubtitle('none') : setSubtitle(id))}
              />
            ) : null}
            {(stream.audioLanguages?.length ?? 0) > 1 && (
              <PlayerMenu
                label="Audio"
                open={menu === 'audio'}
                onToggle={() => setMenu(menu === 'audio' ? 'none' : 'audio')}
                options={stream.audioLanguages!.map((l) => ({ id: l, label: l }))}
                active={stream.audioLanguages![0]}
                onSelect={() => toast('Alternate audio not available for this source', 'info')}
              />
            )}
            {sources.length > 1 && (
              <PlayerMenu
                label="Quality"
                open={menu === 'quality'}
                onToggle={() => setMenu(menu === 'quality' ? 'none' : 'quality')}
                options={sources.map((s, i) => ({ id: String(i), label: s.label }))}
                active={String(quality)}
                onSelect={(id) => switchQuality(Number(id))}
              />
            )}
            <PlayerMenu
              label={`${rate}×`}
              open={menu === 'speed'}
              onToggle={() => setMenu(menu === 'speed' ? 'none' : 'speed')}
              options={SPEEDS.map((s) => ({ id: String(s), label: `${s}×` }))}
              active={String(rate)}
              onSelect={(id) => {
                const v = videoRef.current;
                const r = Number(id);
                if (v) v.playbackRate = r;
                setRate(r);
              }}
            />

            <button onClick={togglePiP} aria-label="Picture in picture" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-ink-muted transition-colors hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-ink-muted transition-colors hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>
      <PlayerFooter
        licenseNote={stream.licenseNote}
        autoplayNext={autoplayNext}
        setAutoplayNext={setAutoplayNext}
        reportBroken={reportBroken}
        hasNext={!!nextEpisodeId}
      />
    </div>
  );
}

function PlayerMenu({
  label,
  open,
  onToggle,
  options,
  active,
  onSelect,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  options: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] items-center rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-white"
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute bottom-full right-0 mb-2 min-w-[120px] overflow-hidden rounded-lg border border-line bg-card shadow-glow-sm"
          >
            {options.map((o) => (
              <button
                key={o.id}
                role="menuitemradio"
                aria-checked={o.id === active}
                onClick={() => {
                  onSelect(o.id);
                  onToggle();
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-xs transition-colors',
                  o.id === active ? 'bg-rose/20 text-rose-light' : 'text-ink-muted hover:bg-rose/10 hover:text-white',
                )}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerFooter({
  licenseNote,
  autoplayNext,
  setAutoplayNext,
  reportBroken,
  hasNext,
}: {
  licenseNote?: string;
  autoplayNext: boolean;
  setAutoplayNext: (v: boolean) => void;
  reportBroken: () => void;
  hasNext: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
      {licenseNote && <span className="flex-1 min-w-[200px]">{licenseNote}</span>}
      <label className="ml-auto flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoplayNext}
          onChange={(e) => setAutoplayNext(e.target.checked)}
          disabled={!hasNext}
          className="h-3.5 w-3.5 accent-rose"
        />
        Autoplay next episode
      </label>
      <button onClick={reportBroken} className="transition-colors hover:text-danger">
        Report broken source
      </button>
    </div>
  );
}
