import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql as drizzleSql } from 'drizzle-orm'
import * as schema from './schema'
import { hashUserPassword } from '../utils/password'

// Idempotent-ish seed: clears domain tables, then inserts demo data.
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set.')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })

  console.log('[seed] Resetting tables...')
  await db.execute(
    drizzleSql`TRUNCATE TABLE
      "mood_vote_events", "mood_votes", "posts", "motions", "users", "divisions"
      RESTART IDENTITY CASCADE`,
  )

  console.log('[seed] Inserting divisions...')
  const [bund] = await db
    .insert(schema.divisions)
    .values({ name: 'Bund', slug: 'bund' })
    .returning()

  const [nrw] = await db
    .insert(schema.divisions)
    .values({ name: 'Landesverband NRW', slug: 'lv-nrw', parentId: bund!.id })
    .returning()

  await db
    .insert(schema.divisions)
    .values({ name: 'Landesverband Bayern', slug: 'lv-bayern', parentId: bund!.id })

  console.log('[seed] Inserting users...')
  const password = await hashUserPassword('password123')

  const [demo] = await db
    .insert(schema.users)
    .values({
      email: 'demo@freiwerk.local',
      passwordHash: password,
      displayName: 'Demo Mitglied',
      role: 'member',
      fn: 'Mitglied',
      divisionId: nrw!.id,
    })
    .returning()

  const [admin] = await db
    .insert(schema.users)
    .values({
      email: 'admin@freiwerk.local',
      passwordHash: password,
      displayName: 'Admin',
      role: 'admin',
      fn: 'Administrator:in',
      divisionId: bund!.id,
    })
    .returning()

  console.log('[seed] Inserting motions...')
  const now = new Date()
  const debateEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const [m1] = await db
    .insert(schema.motions)
    .values({
      authorId: demo!.id,
      title: 'Bürokratieabbau für Gründerinnen und Gründer',
      summary:
        'Schnellere Unternehmensgründung durch ein digitales One-Stop-Verfahren.',
      bodyHtml:
        '<h2>Motivation</h2><p>Gründungen dauern in Deutschland zu lange.</p><h2>Forderung</h2><p>Ein vollständig digitales Gründungsverfahren innerhalb von 24 Stunden.</p><h2>Begründung</h2><p>Andere EU-Länder zeigen, dass es schneller geht.</p>',
      status: 'debate',
      topic: 'wirtschaft',
      divisionId: bund!.id,
      publishedAt: now,
      debateEndsAt: debateEnds,
    })
    .returning()

  const [m2] = await db
    .insert(schema.motions)
    .values({
      authorId: admin!.id,
      title: 'Digitalpakt für Schulen weiterentwickeln',
      summary:
        'Nachhaltige Finanzierung digitaler Infrastruktur und Fortbildung an Schulen.',
      bodyHtml:
        '<h2>Motivation</h2><p>Digitale Bildung darf nicht an der Technik scheitern.</p><h2>Forderung</h2><p>Verstetigung der Mittel und Fokus auf Fortbildung.</p>',
      status: 'debate',
      topic: 'bildung',
      divisionId: nrw!.id,
      publishedAt: now,
      debateEndsAt: debateEnds,
    })
    .returning()

  await db.insert(schema.motions).values({
    authorId: demo!.id,
    title: 'Entwurf: Open-Data-Strategie der Kommunen',
    summary: 'Offene Verwaltungsdaten als Standard.',
    bodyHtml: '<p>Erster Entwurf, noch in Arbeit.</p>',
    status: 'draft',
    topic: 'digitales',
    divisionId: nrw!.id,
  })

  console.log('[seed] Inserting debate posts...')
  await db.insert(schema.posts).values([
    {
      motionId: m1!.id,
      authorId: admin!.id,
      bodyHtml:
        '<p>Starke Idee. Wie verhindern wir Missbrauch bei der Schnellgründung?</p>',
    },
    {
      motionId: m1!.id,
      authorId: demo!.id,
      bodyHtml: '<p>Durch nachgelagerte Prüfungen und klare Haftung.</p>',
    },
  ])

  console.log('[seed] Inserting mood votes...')
  await db.insert(schema.moodVotes).values([
    { motionId: m1!.id, userId: demo!.id, choice: 'approve' },
    { motionId: m1!.id, userId: admin!.id, choice: 'abstain' },
    { motionId: m2!.id, userId: demo!.id, choice: 'approve' },
  ])
  await db.insert(schema.moodVoteEvents).values([
    { motionId: m1!.id, userId: demo!.id, choice: 'approve' },
    { motionId: m1!.id, userId: admin!.id, choice: 'abstain' },
    { motionId: m2!.id, userId: demo!.id, choice: 'approve' },
  ])

  console.log('[seed] Done.')
  await client.end()
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
