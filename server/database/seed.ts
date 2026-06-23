import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql as drizzleSql } from 'drizzle-orm'
import * as schema from './schema'
import { hashUserPassword } from '../utils/password'
import {
  SEED_USERS,
  SEED_MOTIONS,
  MOOD_TIMELINES_BY_TITLE,
  buildMotionBody,
  buildMoodRows,
  buildBallotRows,
  assertMotionBodyLength,
  defaultPostCount,
  daysAgo,
  daysFromNow,
  seedProfileAvatarUrl,
} from './seed-data'
import { buildDeliberationBundle, SEED_POST_BODIES } from './seed-deliberation'
import { FEDERAL_DIVISIONS } from '../../shared/divisions'

// Demo seed: clears domain tables, then inserts demo data.
// Pass --if-empty to skip when the database already has rows (Docker default).
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set.')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })
  const seedIfEmpty = process.argv.includes('--if-empty')

  if (seedIfEmpty) {
    const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
    if (existing.length > 0) {
      console.log('[seed] Database already contains data, skipping (--if-empty).')
      await client.end()
      return
    }
  }

  const now = new Date()

  console.log('[seed] Resetting tables...')
  await db.execute(
    drizzleSql`TRUNCATE TABLE
      "moderation_actions", "reports", "ballots", "ballot_participants",
      "element_upvotes", "element_references", "activity_events",
      "answers", "questions", "arguments", "resources",
      "motion_working_docs", "motion_versions", "motion_watches",
      "mood_vote_events", "mood_votes", "posts", "motions", "users", "divisions"
      RESTART IDENTITY CASCADE`,
  )

  console.log('[seed] Inserting divisions...')
  const divisionIdBySlug: Record<string, string> = {}
  for (const division of FEDERAL_DIVISIONS) {
    const parentId = division.parentSlug
      ? divisionIdBySlug[division.parentSlug]
      : null
    const [row] = await db
      .insert(schema.divisions)
      .values({
        name: division.name,
        slug: division.slug,
        parentId: parentId ?? null,
      })
      .returning()
    divisionIdBySlug[division.slug] = row!.id
  }

  console.log('[seed] Inserting users...')
  const password = await hashUserPassword('password123')
  const insertedUsers = await db
    .insert(schema.users)
    .values(
      SEED_USERS.map((user) => ({
        email: user.email,
        passwordHash: password,
        displayName: user.displayName,
        role: user.role,
        fn: user.fn,
        divisionId: divisionIdBySlug[user.divisionSlug],
        avatarUrl: seedProfileAvatarUrl(user),
      })),
    )
    .returning()

  const userIdByEmail = Object.fromEntries(
    insertedUsers.map((user) => [user.email, user.id]),
  ) as Record<string, string>

  console.log('[seed] Inserting motions...')
  const insertedMotions = []
  const ballotParticipantRows: (typeof schema.ballotParticipants.$inferInsert)[] = []
  const ballotRows: (typeof schema.ballots.$inferInsert)[] = []
  const voterIds = insertedUsers.map((u) => u.id)
  for (const motion of SEED_MOTIONS) {
    const bodyHtml =
      motion.bodyHtml ??
      buildMotionBody(
        motion.bodyTheme,
        motion.bodyDemand,
        motion.bodyStyle ?? 'standard',
      )
    assertMotionBodyLength(
      bodyHtml,
      motion.title,
      motion.bodyHtml ? 'custom' : (motion.bodyStyle ?? 'standard'),
    )

    // Drafts stay at version 0; every published stage carries a v1 snapshot.
    const isPublished = motion.status !== 'draft'

    const publishedAt =
      isPublished && motion.publishedDaysAgo != null
        ? daysAgo(now, motion.publishedDaysAgo)
        : null
    const debateEndsAt =
      isPublished && motion.debateDays != null && publishedAt
        ? daysFromNow(publishedAt, motion.debateDays)
        : null
    const ballotStartedAt =
      motion.ballotStartedDaysAgo != null
        ? daysAgo(now, motion.ballotStartedDaysAgo)
        : null
    const ballotEndsAt =
      ballotStartedAt && motion.ballotDays != null
        ? daysFromNow(ballotStartedAt, motion.ballotDays)
        : null

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
        ballotStartedAt,
        ballotEndsAt,
        outcome: motion.outcome ?? null,
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

    // Seed the secret ballot (anonymous votes + separate participation log).
    if (motion.ballotTally) {
      const { participants, ballots } = buildBallotRows(
        row!.id,
        motion.ballotTally,
        voterIds,
        ballotStartedAt ?? now,
      )
      ballotParticipantRows.push(...participants)
      ballotRows.push(...ballots)
    }

    insertedMotions.push(row!)
  }

  if (ballotParticipantRows.length) {
    await db.insert(schema.ballotParticipants).values(ballotParticipantRows)
  }
  if (ballotRows.length) {
    await db.insert(schema.ballots).values(ballotRows)
  }

  console.log('[seed] Inserting debate posts...')
  const debateMotions = insertedMotions.filter((m) => m.status !== 'draft')
  const motionMetaByTitle = Object.fromEntries(SEED_MOTIONS.map((m) => [m.title, m]))
  const postsByMotionId = new Map<string, string[]>()

  const postRows: (typeof schema.posts.$inferInsert)[] = []
  for (const motion of debateMotions) {
    const meta = motionMetaByTitle[motion.title]
    const authorPool = insertedUsers.filter((u) => u.id !== motion.authorId)
    const postCount = meta ? defaultPostCount(meta) : 3
    for (let i = 0; i < postCount; i++) {
      const author = authorPool[i % authorPool.length]!
      postRows.push({
        motionId: motion.id,
        authorId: author.id,
        bodyHtml: SEED_POST_BODIES[(i + debateMotions.indexOf(motion)) % SEED_POST_BODIES.length]!,
        createdAt: daysAgo(now, Math.max(0, postCount - i)),
      })
    }
  }

  const insertedPosts = await db.insert(schema.posts).values(postRows).returning()
  for (const post of insertedPosts) {
    const list = postsByMotionId.get(post.motionId) ?? []
    list.push(post.id)
    postsByMotionId.set(post.motionId, list)
  }

  const euMotion = debateMotions.find((m) => m.title === 'Europäische Digitale Identität')
  if (euMotion) {
    const euPosts = postsByMotionId.get(euMotion.id) ?? []
    const rootId = euPosts[0]
    if (rootId) {
      const [reply] = await db
        .insert(schema.posts)
        .values({
          motionId: euMotion.id,
          authorId: userIdByEmail['admin@freiwerk.local']!,
          parentId: rootId,
          bodyHtml:
            '<p>Datenschutz muss vorab geklärt werden — siehe auch das Contra-Argument oben.</p>',
          createdAt: daysAgo(now, 0),
        })
        .returning()
      if (reply) {
        euPosts.push(reply.id)
        postsByMotionId.set(euMotion.id, euPosts)
      }
    }
  }

  console.log('[seed] Inserting deliberation elements...')
  const allArguments: (typeof schema.motionArguments.$inferInsert)[] = []
  const allQuestions: (typeof schema.questions.$inferInsert)[] = []
  const allAnswers: (typeof schema.answers.$inferInsert)[] = []
  const allResources: (typeof schema.resources.$inferInsert)[] = []
  const allUpvotes: (typeof schema.elementUpvotes.$inferInsert)[] = []
  const allReferences: (typeof schema.elementReferences.$inferInsert)[] = []
  const allActivity: (typeof schema.activityEvents.$inferInsert)[] = []
  const allWorkingDocs: (typeof schema.motionWorkingDocs.$inferInsert)[] = []

  for (const motion of debateMotions) {
    const meta = motionMetaByTitle[motion.title]
    if (!meta) continue
    const bundle = buildDeliberationBundle({
      motionId: motion.id,
      motionTitle: motion.title,
      bodyHtml: motion.bodyHtml,
      bodyDemand: meta.bodyDemand,
      bodyTheme: meta.bodyTheme,
      authorId: motion.authorId,
      status: motion.status,
      publishedAt: motion.publishedAt,
      deliberationLevel: meta.deliberationLevel,
      userIdByEmail,
      memberIds: insertedUsers.map((u) => u.id),
      postIds: postsByMotionId.get(motion.id) ?? [],
      now,
    })
    allArguments.push(...bundle.arguments)
    allQuestions.push(...bundle.questions)
    allAnswers.push(...bundle.answers)
    allResources.push(...bundle.resources)
    allUpvotes.push(...bundle.upvotes)
    allReferences.push(...bundle.references)
    allActivity.push(...bundle.activityEvents)
    allWorkingDocs.push(...bundle.workingDocs)
  }

  if (allArguments.length) await db.insert(schema.motionArguments).values(allArguments)
  if (allQuestions.length) await db.insert(schema.questions).values(allQuestions)
  if (allAnswers.length) await db.insert(schema.answers).values(allAnswers)
  if (allResources.length) await db.insert(schema.resources).values(allResources)
  if (allUpvotes.length) await db.insert(schema.elementUpvotes).values(allUpvotes)
  if (allReferences.length) await db.insert(schema.elementReferences).values(allReferences)
  if (allActivity.length) await db.insert(schema.activityEvents).values(allActivity)
  if (allWorkingDocs.length) await db.insert(schema.motionWorkingDocs).values(allWorkingDocs)

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
    `[seed] Done. ${insertedUsers.length} users, ${insertedMotions.length} motions, ${insertedPosts.length} posts, ${allArguments.length} arguments, ${allQuestions.length} questions, ${allAnswers.length} answers, ${allResources.length} resources, ${allUpvotes.length} upvotes, ${allWorkingDocs.length} working docs, ${moodVotes.length} mood votes, ${moodEvents.length} mood events, ${ballotRows.length} ballots.`,
  )
  await client.end()
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
