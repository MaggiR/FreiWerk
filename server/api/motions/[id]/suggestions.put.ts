import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionWorkingDocs } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'
import { suggestionSubmitSchema } from '../../../utils/validation'
import {
  validateWorkingDoc,
  countOpenSuggestions,
  extractSuggestions,
  extractMediaRefsFromHtml,
  extractMediaRefsFromDoc,
  mediaRefsEqual,
} from '../../../utils/suggestions'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { docJson, baseRevision } = await readValidatedBody(
    event,
    suggestionSubmitSchema.parse,
  )

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: {
      id: true,
      status: true,
      bodyHtml: true,
      currentVersion: true,
      debateEndsAt: true,
    },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const debateOpen =
    motion.status === 'debate' &&
    (!motion.debateEndsAt || new Date(motion.debateEndsAt).getTime() > Date.now())
  if (!debateOpen) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Änderungsvorschläge sind nur während der laufenden Debatte möglich.',
    })
  }

  const validation = validateWorkingDoc(docJson)
  if (!validation.ok) {
    throw createError({ statusCode: 400, statusMessage: validation.reason })
  }

  // Suggestions may only touch text and formatting — media must stay identical.
  const baseMedia = extractMediaRefsFromHtml(motion.bodyHtml)
  const docMedia = extractMediaRefsFromDoc(docJson)
  if (!mediaRefsEqual(baseMedia, docMedia)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Medien können im Vorschlagsmodus nicht geändert werden.',
    })
  }

  const [existing] = await db
    .select()
    .from(motionWorkingDocs)
    .where(eq(motionWorkingDocs.motionId, id))
    .limit(1)

  const expectedRevision = existing?.revision ?? 0
  if (baseRevision !== expectedRevision) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Das Arbeitsdokument wurde zwischenzeitlich geändert. Bitte neu laden.',
    })
  }

  const now = new Date()
  let revision: number
  if (existing) {
    revision = existing.revision + 1
    await db
      .update(motionWorkingDocs)
      .set({ docJson, revision, updatedAt: now })
      .where(eq(motionWorkingDocs.motionId, id))
  } else {
    revision = 1
    await db.insert(motionWorkingDocs).values({
      motionId: id,
      baseVersion: motion.currentVersion,
      docJson,
      revision,
      updatedAt: now,
    })
  }

  return {
    revision,
    baseVersion: existing?.baseVersion ?? motion.currentVersion,
    openCount: countOpenSuggestions(docJson),
    suggestions: extractSuggestions(docJson),
  }
})
