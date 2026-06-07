# Architecture

FreiWerk is a full-stack Nuxt 4 application. The MVP covers local auth, motion
CRUD with a TipTap editor, linear debate posts, and a non-binding mood poll with
charts. Post-MVP features from the [README](../README.md) (AI assistance, secret
ballots, quorums, amendments, SSO, moderation tooling, export) are intentionally
out of scope, but the data model is kept forward-compatible.

## Stack

- **Frontend/Backend:** Nuxt 4 (Vue 3, TypeScript strict), Nitro server routes
- **Database:** PostgreSQL via Drizzle ORM (`postgres` driver)
- **Auth:** `nuxt-auth-utils` (sealed session cookies, `NUXT_SESSION_PASSWORD`)
- **Security:** `nuxt-security` (rate limiting, CSRF, security headers)
- **Rich text:** TipTap editor; server-side sanitization with `sanitize-html`
- **Charts:** `chart.js` + `vue-chartjs`
- **Validation:** Zod on every API input
- **UI:** design tokens (CSS variables), `@nuxtjs/color-mode`, FontAwesome,
  DejaVu Sans

## Directory layout

```text
app/                Nuxt app (pages, components, layouts, composables, plugins)
  components/        UI primitives (Fw*), domain components (Motion*, Mood*, Post*)
  pages/             Routes: /, /auth/*, /motions/*
  utils/             Client helpers (format, error)
server/
  api/               HTTP endpoints (auth, motions, divisions)
  database/          Drizzle schema, client, migrate runner, seed, migrations/
  utils/             auth, validation (Zod), sanitize, password (scrypt)
shared/              Constants + types shared by app and server
tests/               Vitest unit tests (+ optional e2e)
nginx/               Reverse proxy config (prod profile)
docker/              Container entrypoints
```

## Data model

```text
User      — account, role (member|moderator|admin), optional division
Division  — FDP hierarchy (self-referencing parent)
Motion    — title, summary, sanitized bodyHtml, status, topic, division, debate_ends_at
Post      — linear debate contribution under a motion
MoodVote  — current non-binding vote per user per motion (ring chart)
MoodVoteEvent — append-only log of vote changes (trend/area chart)
```

`motion_status` enum is `draft | debate | ballot | decided`; the MVP only uses
`draft` and `debate`.

## Motion lifecycle (MVP)

```text
draft → debate   (ballot → decided are reserved for post-MVP)
```

- Only the author may edit/delete a motion while it is a `draft`.
- Publishing transitions `draft → debate`, sets `published_at` and a
  `debate_ends_at` deadline (author-defined, default 14 days).
- Published motions are read-only.
- Debate posts and mood votes are only accepted while `status = debate` and
  before `debate_ends_at`.

## Authentication & authorization

- Sessions are sealed cookies managed by `nuxt-auth-utils`.
- Passwords are hashed with scrypt (`server/utils/password.ts`), shared between
  the seed script and the auth endpoints.
- API handlers enforce authorization server-side via `requireAuth` /
  `requireRole` (`server/utils/auth.ts`) — never trust the client.

## Mood trend computation

The ring chart reflects the current distribution from `mood_votes` (one row per
user). The trend/area chart replays `mood_vote_events` in chronological order,
tracking each user's latest choice, so the time series shows the accurate net
distribution over time rather than raw event counts.

## Security notes

- All rich-text (TipTap output) is sanitized server-side before persistence
  (`server/utils/sanitize.ts`); `RichText.vue` renders already-sanitized HTML.
- `nuxt-security` provides rate limiting on mutating endpoints and security
  headers. The built-in XSS validator is disabled because we apply our own
  allow-list sanitization (it would otherwise reject legitimate HTML).
- CSRF: nuxt-security's CSRF module requires `$csrfFetch`/`useCsrfFetch` for every
  mutating request. For the MVP we instead rely on the sealed, SameSite=lax
  session cookie (nuxt-auth-utils) for baseline CSRF protection; full CSRF tokens
  should be wired up post-MVP.
- The strict nonce-based Content-Security-Policy is disabled for the MVP to keep
  SSR/dev working; it should be re-enabled and tuned post-MVP.
- Drafts are never exposed to non-authors (enforced in list + detail endpoints).
