# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=development
# Tools needed for entrypoint (wait for db) and native deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---------- Development ----------
# Dependencies are installed at container start (see docker/entrypoint.sh) so the
# host never needs `npm install`. Source is bind-mounted via docker-compose.
FROM base AS dev
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# Normalize potential CRLF (Windows checkout) to LF so the shebang works.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
  && chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["entrypoint.sh"]

# ---------- Build (production) ----------
FROM base AS build
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---------- Production runtime ----------
FROM node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/package.json ./package.json
COPY docker/entrypoint.prod.sh /usr/local/bin/entrypoint.prod.sh
# Normalize potential CRLF (Windows checkout) to LF so the shebang works.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.prod.sh \
  && chmod +x /usr/local/bin/entrypoint.prod.sh
EXPOSE 3000
ENTRYPOINT ["entrypoint.prod.sh"]
