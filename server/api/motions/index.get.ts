import { and, desc, eq, ne, or, ilike, sql, type SQL } from 'drizzle-orm'
import { db } from '../../database/client'
import { motions, users, divisions, posts, moodVotes } from '../../database/schema'
import { motionListQuerySchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, motionListQuerySchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const conditions: SQL[] = []

  // Visibility: drafts are only listed for their own author.
  const viewingOwn =
    query.authorId !== undefined && query.authorId === currentUserId
  if (!viewingOwn) {
    conditions.push(ne(motions.status, 'draft'))
  }

  if (query.status) conditions.push(eq(motions.status, query.status))
  if (query.topic) conditions.push(eq(motions.topic, query.topic))
  if (query.divisionId) conditions.push(eq(motions.divisionId, query.divisionId))
  if (query.authorId) conditions.push(eq(motions.authorId, query.authorId))
  if (query.q) {
    const pattern = `%${query.q}%`
    const titleOrSummary = or(
      ilike(motions.title, pattern),
      ilike(motions.summary, pattern),
    )
    if (titleOrSummary) conditions.push(titleOrSummary)
  }

  const postCount = sql<number>`(
    select count(*)::int from ${posts} where ${posts.motionId} = ${motions.id}
  )`.as('post_count')

  const approvalCount = sql<number>`(
    select count(*)::int from ${moodVotes}
    where ${moodVotes.motionId} = ${motions.id} and ${moodVotes.choice} = 'approve'
  )`.as('approval_count')

  const voteCount = sql<number>`(
    select count(*)::int from ${moodVotes} where ${moodVotes.motionId} = ${motions.id}
  )`.as('vote_count')

  const orderBy =
    query.sort === 'active'
      ? [desc(postCount), desc(motions.updatedAt)]
      : [desc(motions.publishedAt), desc(motions.createdAt)]

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
      authorId: motions.authorId,
      authorName: users.displayName,
      divisionName: divisions.name,
      postCount,
      approvalCount,
      voteCount,
    })
    .from(motions)
    .leftJoin(users, eq(users.id, motions.authorId))
    .leftJoin(divisions, eq(divisions.id, motions.divisionId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...orderBy)
    .limit(60)

  return { motions: rows }
})
