import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionVersions, motionWatches, motionWorkingDocs } from '../../../database/schema'
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
        columns: { id: true, displayName: true, fn: true },
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
  let versionUpdatedAt = motion.updatedAt
  if (motion.status !== 'draft') {
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
    // Current version is excluded; only prior snapshots count as "older".
    olderVersionCount = Math.max(0, (versionRow?.count ?? 0) - 1)

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
    versionUpdatedAt,
  }
})
