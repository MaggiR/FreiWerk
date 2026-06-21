import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { questions, answers, motions } from '../../../database/schema'
import { questionUpdateSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordActivity } from '../../../utils/activity'
import type { QuestionStatus } from '../../../database/schema'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, questionUpdateSchema.parse)

  const [question] = await db
    .select({
      id: questions.id,
      motionId: questions.motionId,
      authorId: questions.authorId,
    })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1)
  if (!question) {
    throw createError({ statusCode: 404, statusMessage: 'Frage nicht gefunden.' })
  }

  const [motion] = await db
    .select({ authorId: motions.authorId })
    .from(motions)
    .where(eq(motions.id, question.motionId))
    .limit(1)

  const isAsker = question.authorId === user.id
  const isMotionAuthor = motion?.authorId === user.id
  const isModerator = hasRequiredRole(user.role, 'moderator')
  if (!isAsker && !isMotionAuthor && !isModerator) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }

  let nextStatus: QuestionStatus
  if (body.acceptedAnswerId) {
    // Verify the answer belongs to this question.
    const [answer] = await db
      .select({ id: answers.id })
      .from(answers)
      .where(
        and(eq(answers.id, body.acceptedAnswerId), eq(answers.questionId, id)),
      )
      .limit(1)
    if (!answer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Antwort nicht gefunden.',
      })
    }
    nextStatus = 'answered'
  } else {
    // Clearing the accepted answer: keep "partially answered" if answers exist.
    const remaining = await db
      .select({ id: answers.id })
      .from(answers)
      .where(eq(answers.questionId, id))
      .limit(1)
    nextStatus = remaining.length > 0 ? 'partially_answered' : 'open'
  }

  const [updated] = await db
    .update(questions)
    .set({
      acceptedAnswerId: body.acceptedAnswerId,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, id))
    .returning()

  if (body.acceptedAnswerId) {
    await recordActivity({
      motionId: question.motionId,
      actorId: user.id,
      type: 'answer_accepted',
      targetType: 'answer',
      targetId: body.acceptedAnswerId,
    })
  }

  return { question: updated }
})
