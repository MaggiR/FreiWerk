import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionWatches } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  await db
    .delete(motionWatches)
    .where(
      and(eq(motionWatches.motionId, id), eq(motionWatches.userId, user.id)),
    )

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motionWatches)
    .where(eq(motionWatches.motionId, id))

  return { watched: false, watchCount: row?.count ?? 0 }
})
