import { desc, eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { moderationActions, users } from '../../database/schema'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'moderator')

  const actor = users
  const rows = await db
    .select({
      id: moderationActions.id,
      action: moderationActions.action,
      targetType: moderationActions.targetType,
      targetId: moderationActions.targetId,
      reason: moderationActions.reason,
      metadata: moderationActions.metadata,
      createdAt: moderationActions.createdAt,
      actorId: moderationActions.actorId,
      actorName: actor.displayName,
    })
    .from(moderationActions)
    .leftJoin(actor, eq(actor.id, moderationActions.actorId))
    .orderBy(desc(moderationActions.createdAt))
    .limit(200)

  return { actions: rows }
})
