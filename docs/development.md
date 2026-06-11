# Development

FreiWerk runs entirely inside Docker for local development. You do **not** need
to install Node or run `npm install` on your host — dependencies are installed
inside the app container on first start.

## Prerequisites

- Docker + Docker Compose

## Start the dev stack

```bash
docker compose up --build
```

On container start the `app` service:

1. installs dependencies (`npm install`) when needed,
2. waits for PostgreSQL,
3. applies migrations (`npm run db:migrate`),
4. seeds demo data **only when the database is empty** (`npm run db:seed:if-empty`),
5. starts the Nuxt dev server.

PostgreSQL data and uploaded files are stored in named Docker volumes and
survive `docker compose down` / `docker compose up --build`.

| URL | Description |
|-----|-------------|
| http://localhost:3000 | App (dev) |
| localhost:5432 | PostgreSQL |

Stop the stack with `docker compose down`. Data is kept in the named volumes
`freiwerk-db-data` and `freiwerk-uploads-data`.

To wipe all persisted data:

```bash
docker compose down -v
```

To reset demo data without dropping volumes:

```bash
docker compose exec app npm run db:seed
```

Or set `FORCE_SEED=1` on the next container start (truncates and re-seeds).

## Production-like stack (with Nginx)

```bash
docker compose --profile prod up --build
```

| URL | Description |
|-----|-------------|
| http://localhost:8080 | App via Nginx reverse proxy |

## Demo accounts (after seed)

- `demo@freiwerk.local` / `password123` (member)
- `admin@freiwerk.local` / `password123` (admin)

## Database / migrations

Schema lives in [`server/database/schema.ts`](../server/database/schema.ts)
(Drizzle ORM). After changing the schema:

```bash
npm run db:generate   # generate a new migration into server/database/migrations
npm run db:migrate    # apply migrations
```

Commit generated migrations. Inside Docker, migrations run on every start; seed
runs only when the database has no users yet.

## Quality checks

```bash
npm run check         # eslint + nuxt typecheck + vitest
```

Unit tests (`tests/unit/`) are database-independent and run in CI. The optional
end-to-end test (`tests/e2e/`) is skipped unless `RUN_E2E=1` and a seeded
database are available:

```bash
RUN_E2E=1 npm run test
```

## Environment variables

Copy `.env.example` to `.env` only for non-Docker setups; Docker Compose injects
the required values automatically. The session secret is `NUXT_SESSION_PASSWORD`
(used to seal auth cookies). AI provider keys are optional and unused in the MVP.
