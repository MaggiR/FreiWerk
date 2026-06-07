# FreiWerk — Agent Guide

Instructions for AI coding agents working on this repository. Keep this file concise and operational; product vision lives in [README.md](README.md).

## Project

FreiWerk is a digital participation platform for submitting, debating, refining, and deciding on political initiatives within the liberal (FDP) community.

**Stack:** Nuxt 4, Vue 3, TypeScript (strict), PostgreSQL, Drizzle ORM, Docker, Nginx (production), TipTap, FontAwesome.

**Language policy:** All code, comments, documentation, and commit messages are **English**. UI copy and user-facing content are **German**.

## Local development (Docker only)

Do **not** run `npm install` on the host. Dependencies are installed inside Docker containers.

| Action | Command |
|--------|---------|
| Start dev stack | `docker compose up --build` |
| Stop stack | `docker compose down` |
| Production-like stack | `docker compose --profile prod up --build` |
| App URL (dev) | http://localhost:3000 |
| App URL (prod + nginx) | http://localhost:8080 |

On first start the app container runs `npm install`, migrations, seed, and `nuxt dev`.

**Demo accounts** (after seed):

- `demo@freiwerk.local` / `password123`
- `admin@freiwerk.local` / `password123`

## Coding conventions

- TypeScript `strict` mode; avoid `any`.
- Domain terms in English in code: `Motion`, `Post`, `Division`, `MoodVote`, `Amendment`, `Ballot`.
- Use design tokens for colors and typography — no hardcoded FDP brand values in components.
- Brand colors (tokens): `#FFE000` (primary), `#032D67` (secondary), `#00A7E7` (tertiary); font: DejaVu Sans.
- Validate every API input with Zod; add tests for new endpoints.
- Prefer minimal, focused diffs — no drive-by refactors or unrelated changes.
- Do not add new dependencies without clear justification.

## Security (always)

- Enforce authorization in `server/api/`, not only in Vue components.
- Rate-limit mutating endpoints (POST, PUT, PATCH, DELETE).
- Protect sessions with secure cookies; use `NUXT_SESSION_PASSWORD` from `.env`.
- Sanitize TipTap HTML output server-side before render (XSS).
- Never store secrets in code or committed files — use `.env` only.
- Never log PII; keep ballot votes separate from user profiles (required for formal voting in later phases).
- Never couple user IDs to secret ballot records.

## MVP scope boundaries

**In scope (core MVP):**

- Local auth (register/login/session) — SSO comes later
- Roles: member, moderator, admin
- Motion CRUD: draft → publish → debate, featuring a TipTap editor with all basic formatting options
- Linear debate posts under a motion
- Non-binding mood poll (approve / reject / abstain / undecided) with charts
- Landing page, sleek and modern look (glass morphism header menu), and dark/light mode

**Out of scope until explicitly requested:**

- AI features (summaries, argument extraction, semantic search)
- Formal secret ballots, quorums, and voting phases
- Motion versioning and amendments
- Email notifications, moderation tools, PDF export
- FDP member portal SSO

When in doubt, check MVP boundaries before implementing README features.

## Motion lifecycle (MVP)

```text
draft → debate → (ballot → decided)   # ballot/decided are post-MVP
```

- Only the author may edit or delete a motion in `draft` status.
- Published motions are read-only in MVP (no amendments yet).
- Debate posts allowed only while `status = debate` and before `debate_ends_at`.
- Mood votes are non-binding and distinct from formal ballots.

## Do not modify

- `.env` (local only)
- Generated migration files after they have been applied to shared environments
- Lockfiles unless intentionally upgrading dependencies

## Verification before finishing

1. In CI: `npm run check` passes.
2. Locally: `docker compose up --build` starts without errors.
3. Database migrations are committed when schema changes.
4. New API routes have Zod validation and at least one test where behavior is non-trivial.

## Related configuration

| File | Purpose |
|------|---------|
| [README.md](README.md) | Full product specification |
| [docs/development.md](docs/development.md) | Docker workflow details |
| [docs/architecture.md](docs/architecture.md) | Architecture notes |
| `.cursor/rules/*.mdc` | Cursor-specific coding rules (scoped) |
| `.cursor/BUGBOT.md` | Automated PR review priorities |

## Environment variables

Inside Docker Compose these are set automatically. For custom setups, copy `.env.example` to `.env`:

```dotenv
DATABASE_URL="postgresql://freiwerk:freiwerk@localhost:5432/freiwerk"
NUXT_SESSION_PASSWORD="replace-with-a-long-random-secret"
```

AI provider keys (`OLLAMA_*`, `OPENAI_*`, etc.) are optional and not used in MVP.

## Maintenance

When an agent repeatedly makes the same mistake, add one line to this file or to the relevant `.cursor/rules/` entry. Keep updates short and actionable.
