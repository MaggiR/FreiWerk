import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql as drizzleSql } from 'drizzle-orm'
import * as schema from './schema'
import { hashUserPassword } from '../utils/password'
import { seedAvatarHue, writeSeedAvatarFile } from '../utils/seedAvatar'
import {
  SEED_USERS,
  SEED_MOTIONS,
  MOOD_TIMELINES_BY_TITLE,
  buildMotionBody,
  buildMoodRows,
  assertMotionBodyLength,
  daysAgo,
  daysFromNow,
} from './seed-data'

// Idempotent-ish seed: clears domain tables, then inserts demo data.
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set.')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })
  const now = new Date()

  console.log('[seed] Resetting tables...')
  await db.execute(
    drizzleSql`TRUNCATE TABLE
      "motion_working_docs", "motion_versions", "motion_watches", "mood_vote_events",
      "mood_votes", "posts", "motions", "users", "divisions"
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

  const [bayern] = await db
    .insert(schema.divisions)
    .values({ name: 'Landesverband Bayern', slug: 'lv-bayern', parentId: bund!.id })
    .returning()

  const divisionIdBySlug = {
    bund: bund!.id,
    'lv-nrw': nrw!.id,
    'lv-bayern': bayern!.id,
  }

  console.log('[seed] Inserting users...')
  const password = await hashUserPassword('password123')
  const insertedUsers = await db
    .insert(schema.users)
    .values(
      SEED_USERS.map((user, index) => ({
        email: user.email,
        passwordHash: password,
        displayName: user.displayName,
        role: user.role,
        fn: user.fn,
        divisionId: divisionIdBySlug[user.divisionSlug],
        avatarUrl: writeSeedAvatarFile(user.email, seedAvatarHue(index)),
      })),
    )
    .returning()

  const userIdByEmail = Object.fromEntries(
    insertedUsers.map((user) => [user.email, user.id]),
  ) as Record<string, string>

  console.log('[seed] Inserting motions...')
  const insertedMotions = []
  for (const motion of SEED_MOTIONS) {
    const bodyHtml = buildMotionBody(motion.bodyTheme, motion.bodyDemand)
    assertMotionBodyLength(bodyHtml, motion.title)

    const publishedAt =
      motion.status === 'debate' && motion.publishedDaysAgo != null
        ? daysAgo(now, motion.publishedDaysAgo)
        : null
    const debateEndsAt =
      motion.status === 'debate' && motion.debateDays != null && publishedAt
        ? daysFromNow(publishedAt, motion.debateDays)
        : null

    // Published motions carry their v1 content snapshot; drafts stay at version 0.
    const isPublished = motion.status === 'debate'

    const [row] = await db
      .insert(schema.motions)
      .values({
        authorId: userIdByEmail[motion.authorEmail]!,
        title: motion.title,
        summary: motion.summary,
        bodyHtml,
        status: motion.status,
        topic: motion.topic,
        divisionId: divisionIdBySlug[motion.divisionSlug],
        publishedAt,
        debateEndsAt,
        currentVersion: isPublished ? 1 : 0,
        createdAt: publishedAt ?? now,
        updatedAt: now,
      })
      .returning()

    if (isPublished) {
      await db.insert(schema.motionVersions).values({
        motionId: row!.id,
        versionNumber: 1,
        title: row!.title,
        summary: row!.summary,
        bodyHtml: row!.bodyHtml,
        createdById: row!.authorId,
        createdAt: publishedAt ?? now,
      })
    }

    insertedMotions.push(row!)
  }

  console.log('[seed] Inserting debate posts...')
  const debateMotions = insertedMotions.filter((m) => m.status === 'debate')
  const postBodies = [
    '<p>Starke Idee. Wie verhindern wir Missbrauch und sichern gleichzeitig schnelle Verfahren?</p>',
    '<p>Durch nachgelagerte Prüfungen, klare Haftung und transparente Dokumentation aller Schritte.</p>',
    '<p>Ich sehe noch Lücken bei der Finanzierung. Gibt es belastbare Zahlen für die ersten fünf Jahre?</p>',
    '<p>Die Umsetzung sollte modular erfolgen, damit Kommunen schrittweise starten können.</p>',
    '<p>Aus meiner Sicht brauchen wir mehr Bürgerbeteiligung, bevor wir verbindliche Regeln beschließen.</p>',
    '<p>Grundsätzlich überzeugt mich der Ansatz, aber die Datenschutzfragen müssen vorab geklärt werden.</p>',
  ]

  const posts: (typeof schema.posts.$inferInsert)[] = []
  for (const motion of debateMotions) {
    const authorPool = insertedUsers.filter((u) => u.id !== motion.authorId)
    for (let i = 0; i < 3; i++) {
      const author = authorPool[i % authorPool.length]!
      posts.push({
        motionId: motion.id,
        authorId: author.id,
        bodyHtml: postBodies[(i + debateMotions.indexOf(motion)) % postBodies.length]!,
        createdAt: daysAgo(now, Math.max(0, 3 - i)),
      })
    }
  }
  await db.insert(schema.posts).values(posts)

  console.log('[seed] Inserting mood votes...')
  const moodVotes: (typeof schema.moodVotes.$inferInsert)[] = []
  const moodEvents: (typeof schema.moodVoteEvents.$inferInsert)[] = []

  for (const motion of debateMotions) {
    const timelines = MOOD_TIMELINES_BY_TITLE[motion.title]
    if (!timelines?.length) continue
    const { votes, events } = buildMoodRows(motion.id, timelines, userIdByEmail, now)
    moodVotes.push(...votes)
    moodEvents.push(...events)
  }

  if (moodVotes.length) await db.insert(schema.moodVotes).values(moodVotes)
  if (moodEvents.length) await db.insert(schema.moodVoteEvents).values(moodEvents)

  console.log('[seed] Inserting motion watches...')
  const watches: (typeof schema.motionWatches.$inferInsert)[] = []
  for (let i = 0; i < debateMotions.length; i++) {
    const motion = debateMotions[i]!
    const watcher = insertedUsers[(i + 2) % insertedUsers.length]!
    if (watcher.id !== motion.authorId) {
      watches.push({ motionId: motion.id, userId: watcher.id })
    }
    const secondWatcher = insertedUsers[(i + 5) % insertedUsers.length]!
    if (secondWatcher.id !== motion.authorId && secondWatcher.id !== watcher.id) {
      watches.push({ motionId: motion.id, userId: secondWatcher.id })
    }
  }
  await db.insert(schema.motionWatches).values(watches)

  console.log(
    `[seed] Done. ${insertedUsers.length} users, ${insertedMotions.length} motions, ${posts.length} posts, ${moodVotes.length} mood votes, ${moodEvents.length} mood events.`,
  )
  await client.end()
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
