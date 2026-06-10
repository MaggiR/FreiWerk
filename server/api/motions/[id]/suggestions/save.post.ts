import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { motions, motionVersions, motionWorkingDocs } from '../../../../database/schema'
import { requireAuth } from '../../../../utils/auth'
import { suggestionSaveSchema } from '../../../../utils/validation'
import { sanitizeRichText } from '../../../../utils/sanitize'
import {
  validateWorkingDoc,
  countOpenSuggestions,
  extractMediaRefsFromHtml,
  extractMediaRefsFromDoc,
  mediaRefsEqual,
} from '../../../../utils/suggestions'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { cleanHtml, workingDocJson, baseRevision } = await readValidatedBody(
    event,
    suggestionSaveSchema.parse,
  )

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      summary: true,
      bodyHtml: true,
      currentVersion: true,
    },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  // Only the author can accept suggestions into a new version.
  if (motion.authorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Vorschläge können nur in der Debattenphase übernommen werden.',
    })
  }

  const [existing] = await db
    .select()
    .from(motionWorkingDocs)
    .where(eq(motionWorkingDocs.motionId, id))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Es liegen keine Änderungsvorschläge vor.',
    })
  }
  if (baseRevision !== existing.revision) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Das Arbeitsdokument wurde zwischenzeitlich geändert. Bitte neu laden.',
    })
  }

  const newBodyHtml = sanitizeRichText(cleanHtml)

  // Media must remain unchanged versus the published motion text.
  const baseMedia = extractMediaRefsFromHtml(motion.bodyHtml)
  if (!mediaRefsEqual(baseMedia, extractMediaRefsFromHtml(newBodyHtml))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Medien können im Vorschlagsmodus nicht geändert werden.',
    })
  }

  let openCount = 0
  if (workingDocJson !== null) {
    const validation = validateWorkingDoc(workingDocJson)
    if (!validation.ok) {
      throw createError({ statusCode: 400, statusMessage: validation.reason })
    }
    if (!mediaRefsEqual(baseMedia, extractMediaRefsFromDoc(workingDocJson))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Medien können im Vorschlagsmodus nicht geändert werden.',
      })
    }
    openCount = countOpenSuggestions(workingDocJson)
  }

  const contentChanged = newBodyHtml !== motion.bodyHtml
  const now = new Date()

  const result = await db.transaction(async (tx) => {
    let newVersion = motion.currentVersion

    if (contentChanged) {
      newVersion = motion.currentVersion + 1
      await tx
        .update(motions)
        .set({ bodyHtml: newBodyHtml, currentVersion: newVersion, updatedAt: now })
        .where(eq(motions.id, id))

      await tx.insert(motionVersions).values({
        motionId: id,
        versionNumber: newVersion,
        title: motion.title,
        summary: motion.summary,
        bodyHtml: newBodyHtml,
        createdById: user.id,
      })
    }

    // Keep remaining open suggestions rebased onto the new version; otherwise the
    // shared working document is no longer needed.
    if (workingDocJson !== null && openCount > 0) {
      const revision = existing.revision + 1
      await tx
        .update(motionWorkingDocs)
        .set({
          baseVersion: newVersion,
          docJson: workingDocJson,
          revision,
          updatedAt: now,
        })
        .where(eq(motionWorkingDocs.motionId, id))
      return { newVersion, revision }
    }

    await tx
      .delete(motionWorkingDocs)
      .where(eq(motionWorkingDocs.motionId, id))
    return { newVersion, revision: 0 }
  })

  return {
    versionCreated: contentChanged,
    currentVersion: result.newVersion,
    bodyHtml: newBodyHtml,
    revision: result.revision,
    openCount,
  }
})
