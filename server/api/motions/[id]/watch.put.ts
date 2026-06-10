import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionWatches } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, authorId: true },
  })

  if (!motion || (motion.status === 'draft' && motion.authorId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  await db
    .insert(motionWatches)
    .values({ motionId: id, userId: user.id })
    .onConflictDoNothing()

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motionWatches)
    .where(eq(motionWatches.motionId, id))

  return { watched: true, watchCount: row?.count ?? 0 }
})
