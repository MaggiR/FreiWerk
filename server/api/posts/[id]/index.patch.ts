import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts } from '../../../database/schema'
import { postUpdateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'
import { isWithinPostEditWindow } from '../../../utils/posts'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, postUpdateSchema.parse)

  const [post] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      motionId: posts.motionId,
      createdAt: posts.createdAt,
      deletedAt: posts.deletedAt,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
  }
  if (post.deletedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Entfernte Beiträge können nicht bearbeitet werden.',
    })
  }
  if (post.authorId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Nur der Autor kann diesen Beitrag bearbeiten.',
    })
  }
  if (!isWithinPostEditWindow(post.createdAt)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Beiträge können nur innerhalb von zwei Stunden bearbeitet werden.',
    })
  }

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, post.motionId),
    columns: { status: true, debateEndsAt: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Beiträge können nur während der Debattenphase bearbeitet werden.',
    })
  }
  if (motion.debateEndsAt && new Date(motion.debateEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Debattenfrist ist abgelaufen.',
    })
  }

  const bodyHtml = sanitizeRichText(body.bodyHtml)
  if (bodyHtml.trim().length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Der Beitrag darf nicht leer sein.',
    })
  }

  const [updated] = await db
    .update(posts)
    .set({ bodyHtml, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning()

  return { post: updated }
})
