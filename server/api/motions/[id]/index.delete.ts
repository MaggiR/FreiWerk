import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motions } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const existing = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Only the author may delete, and only while the motion is a draft.
  if (existing.authorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (existing.status !== 'draft') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Veröffentlichte Anträge können nicht gelöscht werden.',
    })
  }

  await db.delete(motions).where(eq(motions.id, id))
  setResponseStatus(event, 204)
  return null
})
