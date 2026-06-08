import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motions } from '../../../database/schema'
import { archiveSchema } from '../../../utils/validation'
import { requireAuth, hasRequiredRole } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const { archived } = await readValidatedBody(event, archiveSchema.parse)

  const existing = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, authorId: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // The author may always archive their own motion; moderators may archive any.
  const isAuthor = existing.authorId === user.id
  if (!isAuthor && !hasRequiredRole(user.role, 'moderator')) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }

  const [updated] = await db
    .update(motions)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(motions.id, id))
    .returning()

  return { motion: updated }
})
