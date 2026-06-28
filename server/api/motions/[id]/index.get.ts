import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import {
  motionArguments,
  motionVersions,
  motionWatches,
  motionWorkingDocs,
  moodVotes,
  questions,
  resources,
} from '../../../database/schema'
import { hasRequiredRole } from '../../../utils/authRole'
import { redactMotionAuthor } from '../../../utils/motionAnonymity'
import { countOpenSuggestions } from '../../../utils/suggestions'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    with: {
      author: {
        columns: { id: true, displayName: true, fn: true, avatarUrl: true },
      },
      division: { columns: { id: true, name: true, slug: true } },
    },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Drafts are only visible to their author.
  if (motion.status === 'draft' && motion.authorId !== currentUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const [watchRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motionWatches)
    .where(eq(motionWatches.motionId, id))
  const watchCount = watchRow?.count ?? 0

  let isWatched = false
  if (currentUserId) {
    const [own] = await db
      .select({ id: motionWatches.id })
      .from(motionWatches)
      .where(
        and(
          eq(motionWatches.motionId, id),
          eq(motionWatches.userId, currentUserId),
        ),
      )
      .limit(1)
    isWatched = Boolean(own)
  }

  const redacted = redactMotionAuthor(
    {
      authorId: motion.authorId,
      authorName: motion.author?.displayName ?? null,
      isAnonymous: motion.isAnonymous,
    },
    currentUserId,
  )

  let openSuggestionCount = 0
  let olderVersionCount = 0
  let versionCount = 0
  let argumentCount = 0
  let questionCount = 0
  let resourceCount = 0
  let moodVoteCount = 0
  let versionUpdatedAt = motion.updatedAt
  if (motion.status !== 'draft') {
    const canModerate =
      (currentUserId != null && currentUserId === motion.authorId) ||
      (session.user?.role != null && hasRequiredRole(session.user.role, 'moderator'))

    const [workingDoc] = await db
      .select({ docJson: motionWorkingDocs.docJson })
      .from(motionWorkingDocs)
      .where(eq(motionWorkingDocs.motionId, id))
      .limit(1)
    openSuggestionCount = workingDoc ? countOpenSuggestions(workingDoc.docJson) : 0

    const [versionRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(motionVersions)
      .where(eq(motionVersions.motionId, id))
    versionCount = versionRow?.count ?? 0
    // Current version is excluded; only prior snapshots count as "older".
    olderVersionCount = Math.max(0, versionCount - 1)

    if (motion.currentVersion > 0) {
      const [currentVersionRow] = await db
        .select({ createdAt: motionVersions.createdAt })
        .from(motionVersions)
        .where(
          and(
            eq(motionVersions.motionId, id),
            eq(motionVersions.versionNumber, motion.currentVersion),
          ),
        )
        .limit(1)
      if (currentVersionRow) {
        versionUpdatedAt = currentVersionRow.createdAt
      }
    }

    const [argumentRows, questionCountRow, resourceRows, moodCountRow] = await Promise.all([
      db
        .select({
          status: motionArguments.status,
          authorId: motionArguments.authorId,
        })
        .from(motionArguments)
        .where(eq(motionArguments.motionId, id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(questions)
        .where(eq(questions.motionId, id)),
      db
        .select({
          status: resources.status,
          authorId: resources.authorId,
        })
        .from(resources)
        .where(eq(resources.motionId, id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(moodVotes)
        .where(eq(moodVotes.motionId, id)),
    ])

    argumentCount = argumentRows.filter(
      (row) =>
        row.status === 'accepted' ||
        canModerate ||
        (currentUserId != null && row.authorId === currentUserId),
    ).length
    questionCount = questionCountRow[0]?.count ?? 0
    resourceCount = resourceRows.filter(
      (row) =>
        row.status === 'accepted' ||
        canModerate ||
        (currentUserId != null && row.authorId === currentUserId),
    ).length
    moodVoteCount = moodCountRow[0]?.count ?? 0
  }

  return {
    motion: {
      ...motion,
      authorId: redacted.authorId,
      author: motion.isAnonymous ? null : motion.author,
    },
    watchCount,
    isWatched,
    openSuggestionCount,
    olderVersionCount,
    versionCount,
    argumentCount,
    questionCount,
    resourceCount,
    moodVoteCount,
    versionUpdatedAt,
  }
})
