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

APP_MODE="${NUXT_PUBLIC_APP_MODE:-production}"
if [ "$APP_MODE" = "dev" ] || [ "$APP_MODE" = "demo" ]; then
  if [ "${FORCE_SEED:-0}" = "1" ]; then
    echo "[entrypoint] Force-seeding database (FORCE_SEED=1, mode=$APP_MODE)..."
    npm run db:seed
  else
    echo "[entrypoint] Seeding database if empty (mode=$APP_MODE)..."
    npm run db:seed:if-empty
  fi
else
  echo "[entrypoint] Skipping demo seed (NUXT_PUBLIC_APP_MODE=$APP_MODE)."
fi

echo "[entrypoint] Starting Nuxt server..."
exec node .output/server/index.mjs
