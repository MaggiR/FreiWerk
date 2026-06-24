import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { postSaves, posts } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const [post] = await db
    .select({ id: posts.id, deletedAt: posts.deletedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
  }
  if (post.deletedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Entfernte Beiträge können nicht gemerkt werden.',
    })
  }

  const [existing] = await db
    .select({ id: postSaves.id })
    .from(postSaves)
    .where(and(eq(postSaves.postId, id), eq(postSaves.userId, user.id)))
    .limit(1)

  let saved: boolean
  if (existing) {
    await db.delete(postSaves).where(eq(postSaves.id, existing.id))
    saved = false
  } else {
    await db
      .insert(postSaves)
      .values({ postId: id, userId: user.id })
      .onConflictDoNothing()
    saved = true
  }

  return { saved }
})
