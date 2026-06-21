import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionWorkingDocs, users } from '../../../database/schema'
import { countOpenSuggestions, extractSuggestions } from '../../../utils/suggestions'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, authorId: true, currentVersion: true },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  // Drafts (and their working document) are only visible to their author.
  if (motion.status === 'draft' && motion.authorId !== currentUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const [workingDoc] = await db
    .select()
    .from(motionWorkingDocs)
    .where(eq(motionWorkingDocs.motionId, id))
    .limit(1)

  if (!workingDoc) {
    return {
      docJson: null,
      baseVersion: motion.currentVersion,
      revision: 0,
      suggestions: [],
      openCount: 0,
    }
  }

  const openCount = countOpenSuggestions(workingDoc.docJson)
  if (openCount === 0) {
    // Drop resolved shells so clients do not inherit a stale revision token.
    await db.delete(motionWorkingDocs).where(eq(motionWorkingDocs.motionId, id))
    return {
      docJson: null,
      baseVersion: motion.currentVersion,
      revision: 0,
      suggestions: [],
      openCount: 0,
    }
  }

  const suggestions = extractSuggestions(workingDoc.docJson)
  const authorIds = [
    ...new Set(
      suggestions
        .map((item) => item.authorId)
        .filter((authorId): authorId is string => authorId != null),
    ),
  ]
  const avatarByUserId = new Map<string, string | null>()
  if (authorIds.length > 0) {
    const rows = await db
      .select({ id: users.id, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, authorIds))
    for (const row of rows) {
      avatarByUserId.set(row.id, row.avatarUrl)
    }
  }

  return {
    docJson: workingDoc.docJson,
    baseVersion: workingDoc.baseVersion,
    revision: workingDoc.revision,
    suggestions: suggestions.map((item) => ({
      ...item,
      authorAvatarUrl: item.authorId
        ? avatarByUserId.get(item.authorId) ?? null
        : null,
    })),
    openCount,
  }
})
