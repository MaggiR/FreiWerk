import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { questions, answers, motions } from '../../../database/schema'
import { answerCreateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, answerCreateSchema.parse)

  const [question] = await db
    .select({
      id: questions.id,
      motionId: questions.motionId,
      status: questions.status,
    })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1)
  if (!question) {
    throw createError({ statusCode: 404, statusMessage: 'Frage nicht gefunden.' })
  }

  const [motion] = await db
    .select({ status: motions.status, debateEndsAt: motions.debateEndsAt })
    .from(motions)
    .where(eq(motions.id, question.motionId))
    .limit(1)
  if (!motion || motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Antworten sind nur während der Debattenphase möglich.',
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
      statusMessage: 'Die Antwort darf nicht leer sein.',
    })
  }

  const [created] = await db
    .insert(answers)
    .values({
      questionId: question.id,
      motionId: question.motionId,
      authorId: user.id,
      bodyHtml,
    })
    .returning()

  // A first answer moves an open question to "partially answered".
  if (question.status === 'open') {
    await db
      .update(questions)
      .set({ status: 'partially_answered', updatedAt: new Date() })
      .where(eq(questions.id, question.id))
  }

  await recordActivity({
    motionId: question.motionId,
    actorId: user.id,
    type: 'question_answered',
    targetType: 'question',
    targetId: question.id,
  })

  setResponseStatus(event, 201)
  return { answer: created }
})
