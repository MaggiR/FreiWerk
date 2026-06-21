import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionArguments, motions } from '../../../database/schema'
import { argumentUpdateSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, argumentUpdateSchema.parse)

  const [argument] = await db
    .select({
      id: motionArguments.id,
      motionId: motionArguments.motionId,
      status: motionArguments.status,
    })
    .from(motionArguments)
    .where(eq(motionArguments.id, id))
    .limit(1)
  if (!argument) {
    throw createError({ statusCode: 404, statusMessage: 'Argument nicht gefunden.' })
  }

  const [motion] = await db
    .select({ authorId: motions.authorId })
    .from(motions)
    .where(eq(motions.id, argument.motionId))
    .limit(1)

  // Only the motion author or a moderator may moderate arguments.
  const canModerate =
    (motion != null && user.id === motion.authorId) ||
    hasRequiredRole(user.role, 'moderator')
  if (!canModerate) {
    throw createError({ statusCode: 403, statusMessage: 'Keine ausreichende Berechtigung.' })
  }

  const now = new Date()
  const updates: {
    updatedAt: Date
    status?: 'accepted' | 'rejected'
    reviewedById?: string
    reviewedAt?: Date
    deliberationStatus?: 'open' | 'confirmed' | 'refuted'
  } = { updatedAt: now }
  if (body.status !== undefined) {
    updates.status = body.status
    updates.reviewedById = user.id
    updates.reviewedAt = now
  }
  if (body.deliberationStatus !== undefined) {
    updates.deliberationStatus = body.deliberationStatus
  }

  const [updated] = await db
    .update(motionArguments)
    .set(updates)
    .where(eq(motionArguments.id, id))
    .returning()

  if (body.status === 'accepted') {
    await recordActivity({
      motionId: argument.motionId,
      actorId: user.id,
      type: 'argument_accepted',
      targetType: 'argument',
      targetId: id,
    })
  } else if (body.status === 'rejected') {
    await recordActivity({
      motionId: argument.motionId,
      actorId: user.id,
      type: 'argument_rejected',
      targetType: 'argument',
      targetId: id,
    })
  }
  if (body.deliberationStatus !== undefined) {
    await recordActivity({
      motionId: argument.motionId,
      actorId: user.id,
      type: 'argument_status_changed',
      targetType: 'argument',
      targetId: id,
      metadata: { deliberationStatus: body.deliberationStatus },
    })
  }

  return { argument: updated }
})
