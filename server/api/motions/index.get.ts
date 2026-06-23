import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  isNull,
  isNotNull,
  lte,
  ne,
  or,
  ilike,
  sql,
  type SQL,
} from 'drizzle-orm'
import { db } from '../../database/client'
import {
  motions,
  users,
  divisions,
  posts,
  moodVotes,
  motionWatches,
  ballotParticipants,
} from '../../database/schema'
import { motionListQuerySchema } from '../../utils/validation'
import { redactMotionAuthor } from '../../utils/motionAnonymity'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, motionListQuerySchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const conditions: SQL[] = []

  if (query.authorId) {
    conditions.push(eq(motions.authorId, query.authorId))
    if (query.authorId !== currentUserId) {
      conditions.push(ne(motions.status, 'draft'))
      // Anonymous motions must not appear on another user's profile/list filter.
      conditions.push(eq(motions.isAnonymous, false))
    }
  } else if (query.publishedOnly) {
    conditions.push(ne(motions.status, 'draft'))
  } else if (currentUserId) {
    // Default list: all published motions plus the current user's drafts.
    const visibility = or(
      ne(motions.status, 'draft'),
      eq(motions.authorId, currentUserId),
    )
    if (visibility) conditions.push(visibility)
  } else {
    conditions.push(ne(motions.status, 'draft'))
  }

  // Hide archived motions by default; show only archived when requested.
  conditions.push(
    query.archived ? isNotNull(motions.archivedAt) : isNull(motions.archivedAt),
  )

  // Only the current user's watched motions.
  if (query.watched && currentUserId) {
    conditions.push(
      sql`exists (
        select 1 from ${motionWatches}
        where ${motionWatches.motionId} = ${motions.id}
          and ${motionWatches.userId} = ${currentUserId}
      )`,
    )
  } else if (query.watched && !currentUserId) {
    // Unauthenticated users have no watches.
    conditions.push(sql`false`)
  }

  if (query.ballotPending && currentUserId) {
    conditions.push(eq(motions.status, 'ballot'))
    const ballotOpen = or(
      isNull(motions.ballotEndsAt),
      gt(motions.ballotEndsAt, new Date()),
    )
    if (ballotOpen) conditions.push(ballotOpen)
    conditions.push(
      sql`not exists (
        select 1 from ${ballotParticipants}
        where ${ballotParticipants.motionId} = ${motions.id}
          and ${ballotParticipants.userId} = ${currentUserId}
      )`,
    )
  } else if (query.ballotPending && !currentUserId) {
    conditions.push(sql`false`)
  }

  if (query.status) conditions.push(eq(motions.status, query.status))
  if (query.topic) conditions.push(eq(motions.topic, query.topic))
  if (query.divisionId) conditions.push(eq(motions.divisionId, query.divisionId))
  if (query.q) {
    const pattern = `%${query.q}%`
    const titleOrSummary = or(
      ilike(motions.title, pattern),
      ilike(motions.summary, pattern),
    )
    if (titleOrSummary) conditions.push(titleOrSummary)
  }

  if (query.publishedFrom) {
    conditions.push(gte(motions.publishedAt, new Date(`${query.publishedFrom}T00:00:00.000Z`)))
  }
  if (query.publishedTo) {
    conditions.push(lte(motions.publishedAt, new Date(`${query.publishedTo}T23:59:59.999Z`)))
  }
  if (query.minSupport != null) {
    conditions.push(sql`(
      select count(*)::int from ${moodVotes} where ${moodVotes.motionId} = ${motions.id}
    ) > 0`)
    conditions.push(sql`(
      select count(*)::int from ${moodVotes}
      where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'
    ) * 100 / (
      select count(*)::int from ${moodVotes} where ${moodVotes.motionId} = ${motions.id}
    ) >= ${query.minSupport}`)
  }

  const postCount = sql<number>`(
    select count(*)::int from ${posts} where ${posts.motionId} = ${motions.id}
  )`.as('post_count')

  const approvalCount = sql<number>`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'
  )`.as('approval_count')

  const rejectCount = sql<number>`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'reject'
  )`.as('reject_count')

  const voteCount = sql<number>`(
    select count(*)::int from ${moodVotes} where ${moodVotes.motionId} = ${motions.id}
  )`.as('vote_count')

  // Inlined in ORDER BY (no alias) so it does not need to appear in SELECT.
  const controversyOrder = sql`least(
    (select count(*)::int from ${moodVotes}
      where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'),
    (select count(*)::int from ${moodVotes}
      where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'reject')
  )`

  const pollVoteCount = sql`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id}
      and ${moodVotes.choice} in ('approve', 'reject', 'abstain')
  )`

  const approvalRatioOrder = sql`case
    when ${pollVoteCount} = 0 then 0
    else (
      select count(*)::int from ${moodVotes}
      where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'
    )::float / ${pollVoteCount}
  end`

  const rejectionRatioOrder = sql`case
    when ${pollVoteCount} = 0 then 0
    else (
      select count(*)::int from ${moodVotes}
      where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'reject'
    )::float / ${pollVoteCount}
  end`

  const watchCountOrder = sql`(
    select count(*)::int from ${motionWatches}
    where ${motionWatches.motionId} = ${motions.id}
  )`

  const orderBy = query.ballotPending
    ? [asc(motions.ballotEndsAt), desc(motions.updatedAt)]
    : query.sort === 'active'
      ? [desc(postCount), desc(motions.updatedAt)]
      : query.sort === 'controversial'
        ? [desc(controversyOrder), desc(voteCount), desc(motions.updatedAt)]
        : query.sort === 'popular'
          ? [desc(approvalRatioOrder), desc(pollVoteCount), desc(motions.updatedAt)]
          : query.sort === 'unpopular'
            ? [desc(rejectionRatioOrder), desc(pollVoteCount), desc(motions.updatedAt)]
            : query.sort === 'mostWatched'
            ? [desc(watchCountOrder), desc(motions.updatedAt)]
            : [desc(motions.publishedAt), desc(motions.createdAt)]

  const isWatched = currentUserId
    ? sql<boolean>`exists(
        select 1 from ${motionWatches}
        where ${motionWatches.motionId} = ${motions.id}
        and ${motionWatches.userId} = ${currentUserId}
      )`
    : sql<boolean>`false`

  const whereClause = conditions.length ? and(...conditions) : undefined

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motions)
    .where(whereClause)

  const rows = await db
    .select({
      id: motions.id,
      title: motions.title,
      summary: motions.summary,
      status: motions.status,
      topic: motions.topic,
      createdAt: motions.createdAt,
      publishedAt: motions.publishedAt,
      debateEndsAt: motions.debateEndsAt,
      ballotEndsAt: motions.ballotEndsAt,
      outcome: motions.outcome,
      archivedAt: motions.archivedAt,
      authorId: motions.authorId,
      authorName: users.displayName,
      isAnonymous: motions.isAnonymous,
      divisionName: divisions.name,
      postCount,
      approvalCount,
      rejectCount,
      voteCount,
      isWatched,
    })
    .from(motions)
    .leftJoin(users, eq(users.id, motions.authorId))
    .leftJoin(divisions, eq(divisions.id, motions.divisionId))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(60)

  return {
    motions: rows.map((row) => redactMotionAuthor(row, currentUserId)),
    total: countRow?.count ?? 0,
  }
})
