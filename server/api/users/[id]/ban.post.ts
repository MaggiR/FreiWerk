import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { users } from '../../../database/schema'
import { userBanSchema } from '../../../utils/validation'
import { requireRole } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordModerationAction } from '../../../utils/audit'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, 'moderator')
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, userBanSchema.parse)

  if (id === actor.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Du kannst dich nicht selbst sperren.',
    })
  }

  const [target] = await db
    .select({ id: users.id, role: users.role, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Mitglied nicht gefunden.' })
  }

  // Admins can never be banned; moderators may only ban regular members.
  if (target.role === 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Administrator:innen können nicht gesperrt werden.',
    })
  }
  if (target.role === 'moderator' && !hasRequiredRole(actor.role, 'admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Nur Administrator:innen können Moderator:innen sperren.',
    })
  }
  if (target.bannedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieses Mitglied ist bereits gesperrt.',
    })
  }

  await db
    .update(users)
    .set({ bannedAt: new Date(), banReason: body.reason, bannedById: actor.id })
    .where(eq(users.id, id))

  await recordModerationAction({
    actorId: actor.id,
    action: 'user_banned',
    targetType: 'user',
    targetId: id,
    reason: body.reason,
  })

  return { ok: true }
})
