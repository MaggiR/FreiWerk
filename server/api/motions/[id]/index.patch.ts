import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motions } from '../../../database/schema'
import { motionUpdateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, motionUpdateSchema.parse)

  const existing = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Only the author may edit, and only while the motion is a draft.
  if (existing.authorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (existing.status !== 'draft') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Veröffentlichte Anträge können nicht bearbeitet werden.',
    })
  }

  const updates: Partial<typeof motions.$inferInsert> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.summary !== undefined) updates.summary = body.summary
  if (body.topic !== undefined) updates.topic = body.topic
  if (body.divisionId !== undefined) updates.divisionId = body.divisionId
  if (body.isAnonymous !== undefined) updates.isAnonymous = body.isAnonymous
  if (body.bodyHtml !== undefined) {
    const clean = sanitizeRichText(body.bodyHtml)
    if (clean.trim().length === 0) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Der Antragstext darf nicht leer sein.',
      })
    }
    updates.bodyHtml = clean
  }

  const [updated] = await db
    .update(motions)
    .set(updates)
    .where(eq(motions.id, id))
    .returning()

  return { motion: updated }
})
