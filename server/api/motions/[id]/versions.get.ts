import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionVersions, users } from '../../../database/schema'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, authorId: true },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  // Drafts (and therefore their history) are only visible to their author.
  if (motion.status === 'draft' && motion.authorId !== currentUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const rows = await db
    .select({
      id: motionVersions.id,
      versionNumber: motionVersions.versionNumber,
      title: motionVersions.title,
      summary: motionVersions.summary,
      bodyHtml: motionVersions.bodyHtml,
      createdAt: motionVersions.createdAt,
      createdById: motionVersions.createdById,
      createdByName: users.displayName,
    })
    .from(motionVersions)
    .leftJoin(users, eq(users.id, motionVersions.createdById))
    .where(eq(motionVersions.motionId, id))
    .orderBy(desc(motionVersions.versionNumber))

  return { versions: rows }
})
