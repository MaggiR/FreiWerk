import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { questions, motions } from '../../../database/schema'
import { questionCreateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, questionCreateSchema.parse)

  const [motion] = await db
    .select({
      id: motions.id,
      status: motions.status,
      debateEndsAt: motions.debateEndsAt,
    })
    .from(motions)
    .where(eq(motions.id, id))
    .limit(1)
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Fragen sind nur während der Debattenphase möglich.',
    })
  }
  if (motion.debateEndsAt && new Date(motion.debateEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Debattenfrist ist abgelaufen.',
    })
  }

  const rawBody = body.bodyHtml ?? ''
  const bodyHtml = sanitizeRichText(rawBody)
  const hasBodyText = bodyHtml.replace(/<[^>]*>/g, '').trim().length > 0
  const storedBodyHtml = hasBodyText ? bodyHtml : '<p></p>'

  const [created] = await db
    .insert(questions)
    .values({
      motionId: id,
      authorId: user.id,
      title: body.title,
      bodyHtml: storedBodyHtml,
      status: 'open',
    })
    .returning()

  await recordActivity({
    motionId: id,
    actorId: user.id,
    type: 'question_asked',
    targetType: 'question',
    targetId: created!.id,
    metadata: { title: body.title },
  })

  setResponseStatus(event, 201)
  return { question: created }
})
