# Nekomō

**Discover your next story.** Nekomō is an anime discovery and legally authorized streaming web app — a dark, cinematic, pink-accented catalog with watchlists, progress tracking, search, and a licensed-content-only video player.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, and Zustand.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000

Requires Node.js 18.18+ (or 20+). npm is the only required package manager.

```bash
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
```

## What works out of the box

- **No API key needed.** Metadata comes from the free, documented [Jikan API](https://docs.api.jikan.moe) (MyAnimeList data). Every provider call runs server-side with throttling (Jikan's 3 req/s limit), request timeouts, retries, TTL caching, and a circuit breaker.
- **Works offline too.** If Jikan is unreachable, the app falls back to a bundled catalog of original Nekomō titles so the UI stays fully usable. A small banner notes when you're viewing fallback data.
- **Watchlist / history / progress / ratings** persist in `localStorage` — no account required.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero carousel + trending, seasonal, recently updated, continue watching, recommendations, genres, official trailers |
| `/search` | Debounced search w/ suggestions, filters, sort, pagination — shareable via URL params |
| `/browse` | Filterable catalog (format, status, genre, year, season, rating, sub/dub/official-stream) |
| `/genres` | Genre index |
| `/seasonal` | Season browser with prev/next navigation |
| `/schedule` | Weekly simulcast calendar |
| `/anime/[id]` | Details: synopsis, meta, tabs (overview, episodes, characters, related, reviews, streaming) |
| `/watch/[animeId]/[episodeId]` | Licensed player or official-links fallback |
| `/watchlist`, `/history` | Local library (grid/list view toggle) |
| `/login` | Demo auth — local profile stored on-device (sign-in / register / reset) |
| `/dmca` | Copyright policy + takedown notice form |
| `/contact` | Contact form |
| `/admin` | Demo reports dashboard (submissions via `/api/report`) |
| `/api/suggest` | Search suggestions (rate-limited) |
| `/api/report` | GET list, POST submit, PATCH `?id=` resolve — broken-source, incorrect-info, copyright, contact |

## Responsive design

- Breakpoints cover 320px phones → 1536px+ ultrawide; grids scale 2 → 7 columns, containers cap at ~1560px.
- Mobile: side drawer (scroll-lock, focus trap, Escape/outside-tap close), bottom nav (Home / Search / Schedule / Watchlist / Account), bottom-sheet modals, swipeable carousels and day selectors.
- Desktop: sticky blurred navbar with a keyboard-accessible Genres dropdown, multi-column weekly schedule calendar, hover states with focus equivalents.
- Touch: 44px+ targets, card actions always visible on coarse pointers (no hover-only features), safe-area insets via `env(safe-area-inset-*)` (`viewport-fit=cover`).
- Modals become bottom sheets on small screens; forms are one-column on phones, two-column on desktop, with proper input types and `autocomplete` for password managers.
- The video player never distorts aspect ratio; playback errors show a retry + official-platform fallback links.

## Legal streaming policy

Nekomō **never** embeds unauthorized video. `getAuthorizedStreamingSources()` only returns streams Nekomō owns, licenses, or has explicit permission to embed:

- **Nekomō Originals** episodes stream Creative Commons–licensed films (© Blender Foundation, CC-BY) hosted as public sample media — explicitly cleared for embedding.
- Everything else shows the official trailer (YouTube `youtube-nocookie` embed, ID supplied by the metadata provider) plus links to licensed platforms (Crunchyroll, HIDIVE, Netflix …) — never scraped players, torrents, or DRM bypasses.

## Architecture

```
src/
  app/                  routes, layout, API routes, loading/error/not-found
  components/           Navbar, AnimeCard, HeroCarousel, VideoPlayer, FilterPanel, …
  lib/
    providers/
      index.ts          facade — the only module pages call
      jikan.ts          remote metadata provider (throttled, cached, retries, circuit breaker)
      local.ts          bundled fallback catalog + Nekomō Originals
      streaming.ts      authorized-stream resolution + official links
    cache.ts            in-memory TTL cache
    ratelimit.ts        API-route rate limiter
    store.ts            zustand persisted client state (watchlist/progress/history)
    types.ts            normalized internal data model
    utils.ts
```

To add a real licensed-streaming partner, implement the functions in `src/lib/providers/streaming.ts` (and point `OFFICIAL_STREAMING_API_URL` at it) — the rest of the app consumes normalized types and needs no changes.

## Environment variables

Copy `.env.example` → `.env.local`. All are optional for local dev:

```env
DATABASE_URL=                    # reserved for a future server-side library
AUTH_SECRET=                     # reserved for a future account system
ANIME_METADATA_API_URL=https://api.jikan.moe/v4
ANIME_METADATA_API_KEY=          # not needed for Jikan
OFFICIAL_STREAMING_API_URL=
OFFICIAL_STREAMING_API_KEY=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
DMCA_CONTACT_EMAIL=
SITE_URL=http://localhost:3000
```

**Never commit `.env*` files or secrets** — they're git-ignored. API keys are only read server-side.

## Accessibility & motion

- Animations sit between ~150–500 ms, use transforms/opacity, and respect `prefers-reduced-motion`.
- A "Reduced motion" toggle lives in the account menu (persisted) and forces minimal animation via `MotionConfig reducedMotion` + CSS.
- Keyboard: hero carousel arrows, video shortcuts (Space/K, J/L, ←/→, ↑/↓ volume, F, M), Escape closes menus/dialogs, focus is trapped inside modals and the mobile drawer.
- Nothing is hover-only: card actions are always visible on touch devices, and all info is reachable by keyboard/screen reader.
- Icon buttons carry `aria-label`s; posters are lazy-loaded with generated fallback artwork.

## Notes

- This is an original demo project — it shares no code, branding, or assets with any existing anime site.
- The bundled catalog titles are fictional, written for this project.
- Reports from `/api/report` are logged server-side; wire them to your ticket system or `DMCA_CONTACT_EMAIL` in production.
