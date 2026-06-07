#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] FreiWerk production container starting..."

echo "[entrypoint] Waiting for database at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-freiwerk}" >/dev/null 2>&1; do
  sleep 1
done
echo "[entrypoint] Database is ready."

echo "[entrypoint] Running migrations..."
npm run db:migrate

echo "[entrypoint] Seeding database..."
npm run db:seed

echo "[entrypoint] Starting Nuxt server..."
exec node .output/server/index.mjs
