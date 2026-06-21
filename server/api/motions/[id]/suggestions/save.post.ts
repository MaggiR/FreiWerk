import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { motions, motionVersions, motionWorkingDocs } from '../../../../database/schema'
import { requireAuth } from '../../../../utils/auth'
import { suggestionSaveSchema } from '../../../../utils/validation'
import { sanitizeRichText } from '../../../../utils/sanitize'
import { recordActivity } from '../../../../utils/activity'
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
  const { cleanHtml, workingDocJson, baseRevision, title, summary } = await readValidatedBody(
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

  let [existing] = await db
    .select()
    .from(motionWorkingDocs)
    .where(eq(motionWorkingDocs.motionId, id))
    .limit(1)

  const newBodyHtml = sanitizeRichText(cleanHtml)
  const newTitle = title ?? motion.title
  const newSummary = summary ?? motion.summary
  const contentChanged = newBodyHtml !== motion.bodyHtml
  const metadataChanged = newTitle !== motion.title || newSummary !== motion.summary

  if (existing && countOpenSuggestions(existing.docJson) === 0) {
    await db.delete(motionWorkingDocs).where(eq(motionWorkingDocs.motionId, id))
    existing = undefined
  }

  if (!existing) {
    if (!contentChanged && !metadataChanged) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Es liegen keine Änderungen zum Speichern vor.',
      })
    }

    const now = new Date()
    const newVersion = motion.currentVersion + 1
    await db.transaction(async (tx) => {
      await tx
        .update(motions)
        .set({
          bodyHtml: contentChanged ? newBodyHtml : motion.bodyHtml,
          title: newTitle,
          summary: newSummary,
          currentVersion: newVersion,
          updatedAt: now,
        })
        .where(eq(motions.id, id))

      await tx.insert(motionVersions).values({
        motionId: id,
        versionNumber: newVersion,
        title: newTitle,
        summary: newSummary,
        bodyHtml: contentChanged ? newBodyHtml : motion.bodyHtml,
        createdById: user.id,
      })
    })

    await recordActivity({
      motionId: id,
      actorId: user.id,
      type: 'motion_version',
      targetType: 'motion',
      targetId: id,
      metadata: { version: newVersion },
    })

    return {
      versionCreated: true,
      currentVersion: newVersion,
      title: newTitle,
      summary: newSummary,
      bodyHtml: contentChanged ? newBodyHtml : motion.bodyHtml,
      revision: 0,
      openCount: 0,
    }
  }

  if (baseRevision !== existing.revision) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Das Arbeitsdokument wurde zwischenzeitlich geändert. Bitte neu laden.',
    })
  }

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

  const now = new Date()

  const result = await db.transaction(async (tx) => {
    let newVersion = motion.currentVersion

    if (contentChanged || metadataChanged) {
      newVersion = motion.currentVersion + 1
      await tx
        .update(motions)
        .set({
          bodyHtml: newBodyHtml,
          title: newTitle,
          summary: newSummary,
          currentVersion: newVersion,
          updatedAt: now,
        })
        .where(eq(motions.id, id))

      await tx.insert(motionVersions).values({
        motionId: id,
        versionNumber: newVersion,
        title: newTitle,
        summary: newSummary,
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

  if (contentChanged || metadataChanged) {
    await recordActivity({
      motionId: id,
      actorId: user.id,
      type: 'motion_version',
      targetType: 'motion',
      targetId: id,
      metadata: { version: result.newVersion },
    })
  }

  return {
    versionCreated: contentChanged || metadataChanged,
    currentVersion: result.newVersion,
    title: newTitle,
    summary: newSummary,
    bodyHtml: newBodyHtml,
    revision: result.revision,
    openCount,
  }
})
