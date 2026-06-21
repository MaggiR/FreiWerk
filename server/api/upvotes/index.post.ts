import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../database/client'
import { elementUpvotes } from '../../database/schema'
import { requireAuth } from '../../utils/auth'
import { upvoteToggleSchema } from '../../utils/validation'
import { resolveUpvoteTargetMotion } from '../../utils/upvotes'

// Toggle the current user's single upvote on a deliberation element. There are no
// downvotes; a second call simply removes the upvote.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { targetType, targetId } = await readValidatedBody(
    event,
    upvoteToggleSchema.parse,
  )

  const motionId = await resolveUpvoteTargetMotion(targetType, targetId)
  if (!motionId) {
    throw createError({ statusCode: 404, statusMessage: 'Element nicht gefunden.' })
  }

  const [existing] = await db
    .select({ id: elementUpvotes.id })
    .from(elementUpvotes)
    .where(
      and(
        eq(elementUpvotes.targetType, targetType),
        eq(elementUpvotes.targetId, targetId),
        eq(elementUpvotes.userId, user.id),
      ),
    )
    .limit(1)

  let upvoted: boolean
  if (existing) {
    await db.delete(elementUpvotes).where(eq(elementUpvotes.id, existing.id))
    upvoted = false
  } else {
    await db
      .insert(elementUpvotes)
      .values({ targetType, targetId, userId: user.id })
      .onConflictDoNothing()
    upvoted = true
  }

  const [tally] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(elementUpvotes)
    .where(
      and(
        eq(elementUpvotes.targetType, targetType),
        eq(elementUpvotes.targetId, targetId),
      ),
    )

  return { upvoted, count: tally?.count ?? 0 }
})
