import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { users } from '../../../database/schema'
import { requireRole } from '../../../utils/auth'
import { recordModerationAction } from '../../../utils/audit'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, 'moderator')
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const [target] = await db
    .select({ id: users.id, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Mitglied nicht gefunden.' })
  }
  if (!target.bannedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieses Mitglied ist nicht gesperrt.',
    })
  }

  await db
    .update(users)
    .set({ bannedAt: null, banReason: null, bannedById: null })
    .where(eq(users.id, id))

  await recordModerationAction({
    actorId: actor.id,
    action: 'user_unbanned',
    targetType: 'user',
    targetId: id,
  })

  return { ok: true }
})
