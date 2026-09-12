# Nekomo

**Discover your next story.** Nekomo is an anime discovery and legally authorized streaming web app — a dark-first, pink-accented catalog with watchlists, progress tracking, search, a licensed-content-only video player, themeable UI, and an admin/developer area for source and API management.

**Live demo:** https://nekomo.netlify.app/

> **Note:** This is a web project. It is not affiliated with or linked to any
> Nekomo app or other existing platform.

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
npm test           # vitest unit tests
```

## Deploying

Nekomo is a standard Next.js app — it deploys to Vercel or Netlify with no code changes.

**Vercel**

1. Push the repo to GitHub/GitLab and import it at https://vercel.com/new.
2. Set env vars in **Project → Settings → Environment Variables**
   (`ADMIN_KEY` + `AUTH_SECRET` required for the admin area in production).
3. Deploy. API routes run as serverless functions; security headers apply automatically; HSTS activates in production.

**Netlify**

1. `netlify.toml` is included — it builds with `npm run build` and applies
   `@netlify/plugin-nextjs` (App Router / API routes / images supported).
2. Import the repo at https://app.netlify.com/start, or `netlify deploy --build --prod`.
3. Set env vars in **Site → Environment variables**.

Note: the in-memory admin store (integrations, reports, flags) resets between
serverless invocations on both platforms. Attach a database (see `DATABASE_URL`)
for persistent admin state.

## What works out of the box

- **No API key needed.** Metadata comes from three free, documented APIs — [Jikan](https://docs.api.jikan.moe) (MyAnimeList), [AniList GraphQL](https://docs.anilist.co/), and [Kitsu](https://kitsu.docs.apiary.io/) — chained `Jikan → AniList → Kitsu → local`, each with server-side throttling, timeouts, TTL caching, and a circuit breaker. [AniSkip](https://api.aniskip.com) supplies open episode intro/outro timings for the player's skip-intro overlay.
- **Works offline too.** If all remote providers are unreachable, the app falls back to a bundled catalog of original Nekomo titles so the UI stays fully usable.
- **Sign-in gate + human check.** Browsing requires sign-in; `/login` shows a simple math puzzle first (light bot deterrence — not a security control), and a one-time DMCA/legal disclaimer appears after first sign-in. `/login`, `/dmca`, `/contact`, and the admin areas stay reachable without a profile.
- **AniList sign-in.** Real OAuth — sign in with your AniList account and your watching list + episode progress sync both ways (progress you make on Nekomo is written back to AniList). Falls back to a local on-device profile if you prefer not to use AniList.
- **Watchlist / history / progress / ratings / comments** persist in `localStorage` — no account required.
- **Theme studio** at `/settings`: dark/light/system, 5 accent palettes, background intensity (incl. AMOLED), card styles, density, font size, animation/blur controls — persisted, applied before first paint (no theme flash).
- **Interface languages**: English, Español, Français, Deutsch, 日本語 (nav/footer/settings strings; catalog data stays in its source language).
- **Admin + developer areas** gated by a server-verified session cookie (`ADMIN_KEY` + `AUTH_SECRET`).

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero carousel + trending, seasonal, recently updated, continue watching, recommendations, genres, official trailers |
| `/search` | Debounced search w/ suggestions, filters, sort, pagination — shareable via URL params |
| `/browse` | Filterable catalog (format, status, genre, year, season, rating, sub/dub/official-stream) |
| `/genres` | Genre index |
| `/seasonal` | Season browser with prev/next navigation |
| `/schedule` | Weekly simulcast calendar |
| `/anime/[id]` | Details: synopsis, meta, tabs (overview, episodes, characters, related, reviews, comments, streaming) |
| `/watch/[animeId]/[episodeId]` | Licensed player or official-links fallback |
| `/watchlist`, `/history` | Local library (grid/list view toggle) |
| `/settings` | Theme studio + language + motion/blur controls |
| `/login` | Human check → AniList OAuth or local profile → legal disclaimer |
| `/admin` | **Gated.** Dashboard: overview stats, reports, sources, APIs, audit log |
| `/developer` | **Gated.** Runtime info, feature flags, cache controls, env status |
| `/dmca` | Copyright policy + takedown notice form |
| `/contact` | Contact form |

## API routes

| Route | Access | Purpose |
| --- | --- | --- |
| `GET /api/suggest?q=` | public, rate-limited | Search suggestions |
| `POST /api/report` | public, rate-limited | Submit a report (broken source, copyright, contact…) |
| `GET /api/auth/anilist` | public | Start AniList OAuth (state-cookie CSRF) |
| `GET /api/auth/anilist/callback` | public | OAuth callback → session cookie |
| `GET /api/auth/me` | session | Current user profile (never the token) |
| `GET/POST /api/auth/logout` | session | Clear the session cookie |
| `GET /api/anilist/list` | session | User's current/paused list (continue-watching sync) |
| `POST /api/anilist/progress` | session, rate-limited | Write episode progress back to AniList |
| `GET /api/report` | **admin** | List reports |
| `PATCH /api/report?id=` | **admin** | Resolve a report |
| `POST/DELETE/GET /api/admin/auth` | public (key) | Admin login/logout/status — rate-limited |
| `GET/POST /api/admin/integrations` | **admin** | List/create sources & APIs |
| `PATCH/DELETE /api/admin/integrations/[id]` | **admin** | Edit/remove |
| `POST /api/admin/integrations/test` | **admin**, rate-limited | Health-check an integration (SSRF-guarded) |
| `GET /api/admin/health` | **admin** | System health, config presence (never values) |
| `DELETE /api/admin/cache` | **admin** | Clear provider cache |
| `GET/PATCH /api/admin/flags` | **admin** | Feature flags (maintenance, logging, fallback) |
| `GET /api/admin/audit` | **admin** | Audit log |

## Admin & developer areas

- `/admin` and `/developer` are **server-side gated**: unauthenticated visitors
  only ever receive the login form — the dashboard never ships to their browser.
- Sign in with `ADMIN_KEY`. Sessions are HMAC-signed, HttpOnly, SameSite=Lax
  cookies (8h, `Secure` in production) signed with `AUTH_SECRET`.
- **Sources & APIs**: add/edit/test/enable/disable/reorder/delete integrations.
  Credentials are referenced by env-var name only — values stay server-side,
  never serialized to the client. URLs are validated against SSRF (HTTPS-only
  in production; private IPs, localhost, `.internal`, and cloud-metadata hosts
  rejected — including DNS-resolved addresses).
- **Feature flags**: maintenance mode (public API routes → 503), API/debug
  logging, local-catalog fallback.
- **Audit log**: auth attempts, flag changes, integration CRUD, report actions.
- Health tests are rate-limited, time out, and cap response size.

## Security

- Scoped Content-Security-Policy, `nosniff`, `frame-ancestors 'none'` + XFO,
  Referrer-Policy, Permissions-Policy, COOP; HSTS in production.
- Rate limiting on public mutations and admin auth/test endpoints.
- Provider requests run server-side only; error logs never include URLs w/ keys
  or response bodies.
- Scoped media deterrents only (context menu/drag off on posters + video,
  `controlsList="nodownload"`). **These are not security** — anything sent to a
  browser can be inspected; real protection is server-side auth + licensing.

## Legal streaming policy

Nekomo **never** embeds unauthorized video. `getAuthorizedStreamingSources()` only returns streams Nekomo owns, licenses, or has explicit permission to embed:

- **Nekomo Originals** episodes stream Creative Commons–licensed films (© Blender Foundation, CC-BY) hosted as public sample media — explicitly cleared for embedding.
- Everything else shows the official trailer (YouTube `youtube-nocookie` embed, ID supplied by the metadata provider) plus links to licensed platforms (Crunchyroll, HIDIVE, Netflix …) — never scraped players, torrents, or DRM bypasses.

## Architecture

```
src/
  app/                  routes, layout, API routes, loading/error/not-found
  components/           Navbar, AnimeCard, HeroCarousel, VideoPlayer, FilterPanel, …
  components/admin/     AdminLogin, AdminDashboard, IntegrationsPanel, DeveloperPanel
  lib/
    providers/
      index.ts          facade — the only module pages call (honors admin flags)
      jikan.ts          primary metadata provider (throttled, cached, retries, circuit breaker)
      anilist.ts        secondary metadata provider (open GraphQL API, auto-fallback)
      kitsu.ts          tertiary metadata provider (Kitsu JSON:API, auto-fallback)
      aniskip.ts        intro/outro timings → player skip overlay
      local.ts          bundled fallback catalog + Nekomo Originals
      streaming.ts      authorized-stream resolution + official links
    admin/store.ts      integrations, feature flags, audit log (in-memory)
    auth.ts             HMAC admin session cookie
    ssrf.ts             SSRF guard for admin-configured URLs
    i18n.ts             UI-string dictionaries (en/es/fr/de/ja)
    cache.ts            in-memory TTL cache
    ratelimit.ts        API-route rate limiter
    store.ts            zustand persisted client state (watchlist/theme/language/…)
    types.ts            normalized internal data model
tests/                  vitest unit tests
```

To add a real licensed-streaming partner, implement the functions in `src/lib/providers/streaming.ts` (and point `OFFICIAL_STREAMING_API_URL` at it) — the rest of the app consumes normalized types and needs no changes.

## Environment variables

Copy `.env.example` → `.env.local`. All are optional for local dev **except**
`ADMIN_KEY` + `AUTH_SECRET`, which are required to access `/admin` in production
(in dev, the fallback admin key is `dev-admin-key`).

```env
DATABASE_URL=                    # reserved for a future server-side library
ADMIN_KEY=                       # gates /admin + /developer
AUTH_SECRET=                     # signs the admin + AniList session cookies
ANILIST_CLIENT_ID=               # AniList OAuth — sign-in + list sync
ANILIST_CLIENT_SECRET=           # register at anilist.co/settings/developer
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
- Motion controls in `/settings` and the account menu (persisted) force minimal animation via `MotionConfig reducedMotion` + CSS.
- Keyboard: hero carousel arrows, video shortcuts (Space/K, J/L, ←/→, ↑/↓ volume, F, M), Escape closes menus/dialogs, focus is trapped inside modals and the mobile drawer.
- Nothing is hover-only: card actions are always visible on touch devices, and all info is reachable by keyboard/screen reader.
- Icon buttons carry `aria-label`s; posters are lazy-loaded with generated fallback artwork.

## Notes

- This is an original demo project — it shares no code, branding, or assets with any existing anime site.
- The bundled catalog titles are fictional, written for this project.
- Reports from `/api/report` are logged server-side; wire them to your ticket system or `DMCA_CONTACT_EMAIL` in production.
- For privacy, the footer recommends browsing with a VPN and/or DNS ad blocker.
