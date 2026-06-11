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

On container start the app runs `npm install` (when needed), migrations, seed-if-empty, and `nuxt dev`. DB and uploads persist in Docker volumes across restarts.

**Demo accounts** (after seed):

- `demo@freiwerk.local` / `password123`
- `admin@freiwerk.local` / `password123`

## Coding conventions

- TypeScript `strict` mode; avoid `any`.
- Domain terms in English in code: `Motion`, `Post`, `Division`, `MoodVote`, `Suggestion`, `Ballot`.
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

## Database handling
PostgreSQL and uploads use named Docker volumes (`freiwerk-db-data`, `freiwerk-uploads-data`) and persist across `docker compose up` unless `docker compose down -v` is used.

## Feature status and roadmap

Cross-checked [README.md](README.md) (feature catalog 1–10) with the actual code state (DB schema, `server/api/`, `app/pages`, `app/components`). When in doubt, check the phase plan below before implementing README features.

Legend: `[x]` done · `[~]` partial · `[ ]` open

### 1. Member access and roles

- [x] Local auth: register/login/logout/session (scrypt, `nuxt-auth-utils`)
- [x] Role model `member`/`moderator`/`admin` in DB + `requireRole` helper
- [x] Assignment to division level (Division, hierarchical)
- [~] Personal profile: only `displayName` in header, `fn` field in DB — no profile page, no motion history
- [ ] Role/committee rights visibly used (LFA, BFA, LaVo, …) — `requireRole` not active in any endpoint, no role display in UI
- [ ] FDP member portal SSO (post-MVP)
- [ ] Email notifications (post-MVP)

### 2. Motion submission

- [x] Create motion, save draft, publish (`draft → debate`)
- [x] Fields title, summary, body (TipTap), topic, division level
- [x] Images + PDF/file attachments (upload, MIME whitelist, 5 MB, attachment chips)
- [x] Edit/delete only for author in `draft` status
- [x] Motion stages visualized: full `draft → debate → ballot → decided` lifecycle
- [ ] Video attachments
- [x] Versioning + change history (`motion_versions`; v1 on publish, new version when the author saves accepted suggestions)
- [x] Suggestion mode (Google-Docs-style): inline edits tracked as `insertion`/`deletion`/`modification` marks in one shared working document per motion (`motion_working_docs`); author accepts/rejects → new version. Powered by `@handlewithcare/prosemirror-suggest-changes` on top of TipTap. Text + formatting only (no media changes).
- [ ] Automatic linking of similar motions (AI)
- [ ] Archiving of withdrawn/completed motions

### 3. Structured debates

- [x] Linear debate posts under a motion, only when `status=debate` before `debate_ends_at`
- [~] Post input: plain textarea instead of TipTap
- [ ] Topic tree view
- [ ] Post ratings
- [ ] Sort posts by approval/recency
- [ ] AI extraction pro/contra/questions + juxtaposition (AI)

### 4. Further AI support

- [ ] Changelog between versions, semantic similarity, wording help, report function (all post-MVP/AI)

### 5. Mood polls

- [x] Ongoing mood poll, position changeable anytime (upsert + event log)
- [x] Ring chart (current) + trend/area chart (history) + participation
- [~] Choices: approve/reject/abstain in UI — `undecided` missing as button (DB enum only)

### 6. Decision procedures

- [x] Debate deadline configurable (`debate_ends_at`)
- [x] Voting deadline (`ballot_ends_at`), set when the ballot phase opens
- [x] Secret ballot with vote/profile separation (`ballots` + `ballot_participants`)
- [x] Lock during voting (posts, suggestions, mood disabled while `status=ballot`)
- Quorums are intentionally out of scope (simple majority decides the outcome)

### 7. Transparency and tracking

- [ ] Permanent decision documentation, follow-up decisions, PDF/Markdown export (post-MVP)

### 8. Moderation and debate culture

- [ ] Code of conduct, report function, moderation tools, escalation/bans (post-MVP)

### 9. Search and navigation

- [x] Text search + filters status/topic/division/author + sorting, URL sync
- [ ] Filters date range + support level
- [ ] Watch individual motions
- [ ] Personal feed, thematic overview pages, voting/deadline overview, archive
- [ ] Semantic full-text search (AI)

### 10. Other

- [x] Dark/light toggle, glassmorphism header
- [~] Landing page: hot debates + recent + own motions present; "controversial" and "watched" missing

### Recommended development order

Phases build on each other: MVP gaps and user engagement first, then versioning/collaboration (prerequisite for formal voting), then formal decisions, then governance, finally AI and SSO.

```mermaid
flowchart TD
    P1["Phase 1: MVP polish"] --> P2["Phase 2: User engagement and profile"]
    P2 --> P3["Phase 3: Versioning and suggestion mode"]
    P3 --> P4["Phase 4: Formal decisions (secret ballot)"]
    P4 --> P5["Phase 5: Transparency and moderation"]
    P5 --> P6["Phase 6: AI support"]
    P6 --> P7["Phase 7: SSO and notifications"]
```

**Phase 1 — MVP polish (small, quick gaps)**

- Add `undecided` as fourth mood option in UI (DB enum exists)
- Landing page "controversial" block (new sort/query mode in `GET /api/motions`)
- Date range + support level filters on `/motions`
- Sort debate posts (recency); optionally TipTap instead of textarea in `PostForm`
- Video attachments (MIME whitelist in `server/utils/uploads.ts` + extend editor input)

**Phase 2 — User engagement and profile**

- Profile page (`/profil` or `/users/[id]`): role, state association, motion history, supported motions
- Role display in UI; activate `requireRole` in relevant endpoints
- Watch/favorite motions (new `watches` table)
- Personal feed + watched motions on landing page
- Archive view + archive status for motions

**Phase 3 — Versioning and suggestion mode** (done)

- [x] Motion versioning + change history (`motion_versions` table)
- [x] Suggestion mode instead of structured amendments: one shared working document per motion (`motion_working_docs`, ProseMirror JSON with suggestion marks). Endpoints `GET/PUT /api/motions/[id]/suggestions` and `POST /api/motions/[id]/suggestions/save`. Concurrency is guarded by an optimistic `revision` check (409 → reload).
- [ ] **Future requirement (binding): real-time collaboration** (e.g. Yjs/CRDT) to replace the optimistic version check, since simultaneous editing of suggestions will become common.

**Phase 4 — Formal decisions** (done)

- [x] `ballot`/`decided` lifecycle activated (`debate → ballot → decided`). The author
  opens the ballot from an active debate; finalizing (author/moderator, after the
  deadline) computes the outcome and moves the motion to `decided`.
- [x] Secret ballot with vote/profile separation: `ballots` stores anonymous choices
  (no user reference); `ballot_participants` records who voted (no choice). The two
  tables are never joined, so a member can never be linked to a vote.
- [x] Voting deadline (`ballot_ends_at`) and lock during voting (posts, suggestions and
  mood votes are blocked while `status=ballot`). The tally stays hidden until `decided`.
- Quorums and a dedicated decision audit trail are intentionally out of scope. The
  outcome is a simple majority (approvals > rejections; abstentions do not count).

**Phase 5 — Transparency and moderation**

- Decision documentation, follow-up decisions, implementation steps
- PDF/Markdown export
- Code of conduct, report function, moderation tools with mandatory reasoning, escalation/bans
- Audit logs for administrative/moderative actions

**Phase 6 — AI support**

- Semantic full-text search + similar motion hints (vector search)
- AI extraction pro/contra/questions + structured juxtaposition + rating
- Summaries, changelog between versions, wording help, report/feedback for AI

**Phase 7 — Integration and notifications**

- FDP member portal SSO (replace local auth)
- Email notifications for debates, deadlines, votes
- Committee roles (LFA, BFA, LaVo, BuVo) and their special rights

### Motion lifecycle

```text
draft → debate → ballot → decided
```

- Only the author may edit or delete a motion in `draft` status.
- Published motions are refined via suggestion mode (Phase 3); the author bakes accepted suggestions into a new version.
- Debate posts allowed only while `status = debate` and before `debate_ends_at`.
- Mood votes are non-binding and distinct from formal ballots.
- The author opens the ballot from an active debate (`debate → ballot`), which sets `ballot_ends_at`. While `status = ballot` the motion is locked: no posts, suggestions or mood votes.
- Ballots are secret: choices live in `ballots` (no user reference), participation in `ballot_participants` (no choice). One vote per member, no changes after casting.
- Finalizing (author or moderator, after `ballot_ends_at`) tallies the ballots, stores the `outcome` (`accepted`/`rejected`, simple majority), and moves the motion to `decided`. The tally is revealed only once `decided`.

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
