import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionWorkingDocs } from '../../../database/schema'
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

  return {
    docJson: workingDoc.docJson,
    baseVersion: workingDoc.baseVersion,
    revision: workingDoc.revision,
    suggestions: extractSuggestions(workingDoc.docJson),
    openCount: countOpenSuggestions(workingDoc.docJson),
  }
})
