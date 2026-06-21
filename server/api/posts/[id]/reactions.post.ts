import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts, postReactions } from '../../../database/schema'
import { postReactionSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { aggregatePostReactions } from '../../../utils/postReactions'

const paramsSchema = z.object({ id: z.string().uuid() })

async function reactionsForPost(postId: string, userId: string) {
  const rows = await db
    .select({
      postId: postReactions.postId,
      emoji: postReactions.emoji,
      userId: postReactions.userId,
    })
    .from(postReactions)
    .where(eq(postReactions.postId, postId))

  return aggregatePostReactions(rows, userId).get(postId) ?? []
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { emoji } = await readValidatedBody(event, postReactionSchema.parse)

  const [post] = await db
    .select({ id: posts.id, motionId: posts.motionId, deletedAt: posts.deletedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)

  if (!post || post.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
  }

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, post.motionId),
    columns: { status: true },
  })
  if (!motion || motion.status === 'draft') {
    throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
  }

  const [existing] = await db
    .select({ id: postReactions.id })
    .from(postReactions)
    .where(
      and(
        eq(postReactions.postId, id),
        eq(postReactions.userId, user.id),
        eq(postReactions.emoji, emoji),
      ),
    )
    .limit(1)

  if (existing) {
    await db.delete(postReactions).where(eq(postReactions.id, existing.id))
  } else {
    await db.insert(postReactions).values({ postId: id, userId: user.id, emoji })
  }

  return { reactions: await reactionsForPost(id, user.id) }
})
