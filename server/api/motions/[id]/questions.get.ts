import { z } from 'zod'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { questions, answers, motions, users } from '../../../database/schema'
import { hasRequiredRole } from '../../../utils/authRole'
import { getUpvoteSummaries } from '../../../utils/upvotes'
import type { QuestionItem, AnswerItem } from '../../../../shared/types'

const paramsSchema = z.object({ id: z.string().uuid() })

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id
  const currentRole = session.user?.role

  const motion = await db.query.motions.findFirst({
    where: eq(motions.id, id),
    columns: { id: true, authorId: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const isModerator =
    (currentUserId != null && currentUserId === motion.authorId) ||
    (currentRole != null && hasRequiredRole(currentRole, 'moderator'))

  const questionRows = await db
    .select({
      id: questions.id,
      title: questions.title,
      bodyHtml: questions.bodyHtml,
      status: questions.status,
      acceptedAnswerId: questions.acceptedAnswerId,
      authorId: questions.authorId,
      authorName: users.displayName,
      authorAvatarUrl: users.avatarUrl,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .leftJoin(users, eq(users.id, questions.authorId))
    .where(eq(questions.motionId, id))
    .orderBy(desc(questions.createdAt))

  const answerRows = await db
    .select({
      id: answers.id,
      questionId: answers.questionId,
      bodyHtml: answers.bodyHtml,
      authorId: answers.authorId,
      authorName: users.displayName,
      authorAvatarUrl: users.avatarUrl,
      createdAt: answers.createdAt,
    })
    .from(answers)
    .leftJoin(users, eq(users.id, answers.authorId))
    .where(eq(answers.motionId, id))
    .orderBy(asc(answers.createdAt))

  const questionUpvotes = await getUpvoteSummaries(
    'question',
    questionRows.map((r) => r.id),
    currentUserId,
  )
  const answerUpvotes = await getUpvoteSummaries(
    'answer',
    answerRows.map((r) => r.id),
    currentUserId,
  )

  const answersByQuestion = new Map<string, AnswerItem[]>()
  for (const row of answerRows) {
    const list = answersByQuestion.get(row.questionId) ?? []
    const upvote = answerUpvotes.get(row.id)
    list.push({
      id: row.id,
      bodyHtml: row.bodyHtml,
      authorId: row.authorId,
      authorName: row.authorName,
      authorAvatarUrl: row.authorAvatarUrl,
      createdAt: toIso(row.createdAt),
      upvoteCount: upvote?.count ?? 0,
      upvotedByMe: upvote?.upvotedByMe ?? false,
      isAccepted: false,
      isMine: currentUserId != null && row.authorId === currentUserId,
    })
    answersByQuestion.set(row.questionId, list)
  }

  const items: QuestionItem[] = questionRows.map((row) => {
    const upvote = questionUpvotes.get(row.id)
    const list = answersByQuestion.get(row.id) ?? []
    for (const answer of list) {
      answer.isAccepted = answer.id === row.acceptedAnswerId
    }
    // Accepted answer first, then by upvotes, then oldest first.
    list.sort((a, b) => {
      if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1
      if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    const isAsker = currentUserId != null && row.authorId === currentUserId
    return {
      id: row.id,
      title: row.title,
      bodyHtml: row.bodyHtml,
      status: row.status,
      authorId: row.authorId,
      authorName: row.authorName,
      authorAvatarUrl: row.authorAvatarUrl,
      createdAt: toIso(row.createdAt),
      upvoteCount: upvote?.count ?? 0,
      upvotedByMe: upvote?.upvotedByMe ?? false,
      acceptedAnswerId: row.acceptedAnswerId,
      isMine: isAsker,
      canAccept: isAsker || isModerator,
      answers: list,
    }
  })

  return { questions: items }
})
