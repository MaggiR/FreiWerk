import { z } from 'zod'
import { and, desc, eq, isNull, ne, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../../database/client'
import {
  motions,
  users,
  divisions,
  posts,
  moodVotes,
  motionWatches,
} from '../../database/schema'
import { redactMotionAuthor } from '../../utils/motionAnonymity'

const paramsSchema = z.object({ id: z.string().uuid() })

function motionColumnsFor(viewerId?: string) {
  const isWatched = viewerId
    ? sql<boolean>`exists(
        select 1 from ${motionWatches}
        where ${motionWatches.motionId} = ${motions.id}
        and ${motionWatches.userId} = ${viewerId}
      )`
    : sql<boolean>`false`

  return {
  id: motions.id,
  title: motions.title,
  summary: motions.summary,
  status: motions.status,
  topic: motions.topic,
  createdAt: motions.createdAt,
  publishedAt: motions.publishedAt,
  debateEndsAt: motions.debateEndsAt,
  archivedAt: motions.archivedAt,
  authorId: motions.authorId,
  authorName: users.displayName,
  isAnonymous: motions.isAnonymous,
  divisionName: divisions.name,
  postCount: sql<number>`(
    select count(*)::int from ${posts} where ${posts.motionId} = ${motions.id}
  )`,
  approvalCount: sql<number>`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'
  )`,
  rejectCount: sql<number>`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'reject'
  )`,
  voteCount: sql<number>`(
    select count(*)::int from ${moodVotes} where ${moodVotes.motionId} = ${motions.id}
  )`,
  isWatched,
  }
}

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const isSelf = session.user?.id === id

  const profile = await db.query.users.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, id),
    columns: {
      id: true,
      displayName: true,
      fn: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
    with: { division: { columns: { id: true, name: true } } },
  })

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Profil nicht gefunden.' })
  }

  // Authored motions: drafts and archived ones only visible to the profile owner.
  const authoredConditions: SQL[] = [eq(motions.authorId, id)]
  if (!isSelf) {
    const visibility = and(ne(motions.status, 'draft'), isNull(motions.archivedAt))
    if (visibility) authoredConditions.push(visibility)
    authoredConditions.push(eq(motions.isAnonymous, false))
  }

  const motionColumns = motionColumnsFor(session.user?.id)

  const authored = await db
    .select(motionColumns)
    .from(motions)
    .leftJoin(users, eq(users.id, motions.authorId))
    .leftJoin(divisions, eq(divisions.id, motions.divisionId))
    .where(and(...authoredConditions))
    .orderBy(desc(motions.createdAt))
    .limit(50)

  // Watched motions are private to the profile owner.
  let watched: typeof authored = []
  if (isSelf) {
    const watchVisibility = or(
      ne(motions.status, 'draft'),
      eq(motions.authorId, id),
    )
    watched = await db
      .select(motionColumns)
      .from(motionWatches)
      .innerJoin(motions, eq(motions.id, motionWatches.motionId))
      .leftJoin(users, eq(users.id, motions.authorId))
      .leftJoin(divisions, eq(divisions.id, motions.divisionId))
      .where(
        and(
          eq(motionWatches.userId, id),
          isNull(motions.archivedAt),
          watchVisibility ?? sql`true`,
        ),
      )
      .orderBy(desc(motionWatches.createdAt))
      .limit(50)
  }

  const viewerId = session.user?.id

  return {
    user: {
      id: profile.id,
      displayName: profile.displayName,
      fn: profile.fn,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      division: profile.division,
    },
    isSelf,
    motions: authored.map((row) => redactMotionAuthor(row, viewerId)),
    watched: watched.map((row) => redactMotionAuthor(row, viewerId)),
  }
})
