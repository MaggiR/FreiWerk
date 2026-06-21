import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts } from '../../../database/schema'
import { postModerationDeleteSchema } from '../../../utils/validation'
import { requireRole } from '../../../utils/auth'
import { recordModerationAction } from '../../../utils/audit'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'moderator')
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, postModerationDeleteSchema.parse)

  const [post] = await db
    .select({ id: posts.id, motionId: posts.motionId, deletedAt: posts.deletedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
  }
  if (post.deletedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieser Beitrag wurde bereits entfernt.',
    })
  }

  // Soft delete: keep the row so threaded replies survive as a tombstone.
  await db
    .update(posts)
    .set({
      deletedAt: new Date(),
      deletedById: user.id,
      deletedReason: body.reason,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  await recordModerationAction({
    actorId: user.id,
    action: 'post_removed',
    targetType: 'post',
    targetId: id,
    reason: body.reason,
    metadata: { motionId: post.motionId },
  })

  return { ok: true }
})
