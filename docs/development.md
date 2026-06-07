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

On first start the `app` container:

1. installs dependencies (`npm install`),
2. waits for PostgreSQL,
3. applies migrations (`npm run db:migrate`),
4. seeds demo data (`npm run db:seed`),
5. starts the Nuxt dev server.

| URL | Description |
|-----|-------------|
| http://localhost:3000 | App (dev) |
| localhost:5432 | PostgreSQL |

Stop the stack with `docker compose down` (add `-v` to also drop the database
volume).

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

Commit generated migrations. Inside Docker, migrations + seed run automatically
on container start.

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
