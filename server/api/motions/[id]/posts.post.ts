import { z } from 'zod'
import { db } from '../../../database/client'
import { posts } from '../../../database/schema'
import { postCreateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, postCreateSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    columns: { id: true, status: true, debateEndsAt: true },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Posts are only allowed during an open debate phase.
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Beiträge sind nur während der Debattenphase möglich.',
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

  const [created] = await db
    .insert(posts)
    .values({ motionId: id, authorId: user.id, bodyHtml })
    .returning()

  setResponseStatus(event, 201)
  return { post: created }
})
