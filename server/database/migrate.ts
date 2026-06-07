import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Standalone migration runner (used by `npm run db:migrate` and the Docker
// entrypoints). Uses a dedicated single connection so it can close cleanly.
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set.')
  }

  const sql = postgres(url, { max: 1 })
  const db = drizzle(sql)

  console.log('[migrate] Applying migrations...')
  await migrate(db, { migrationsFolder: './server/database/migrations' })
  console.log('[migrate] Done.')

  await sql.end()
}

main().catch((err) => {
  console.error('[migrate] Failed:', err)
  process.exit(1)
})
