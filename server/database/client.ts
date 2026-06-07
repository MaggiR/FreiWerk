import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Provide it via .env or docker-compose.',
    )
  }
  return url
}

// Reuse a single connection pool across hot reloads / requests.
const globalForDb = globalThis as unknown as {
  __freiwerkSql?: ReturnType<typeof postgres>
}

const sql =
  globalForDb.__freiwerkSql ?? postgres(resolveDatabaseUrl(), { max: 10 })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__freiwerkSql = sql
}

export const db = drizzle(sql, { schema })
export { schema, sql }
