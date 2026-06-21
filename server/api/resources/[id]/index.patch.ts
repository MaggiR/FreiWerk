import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { resources, motions } from '../../../database/schema'
import { resourceUpdateSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, resourceUpdateSchema.parse)

  const [resource] = await db
    .select({ id: resources.id, motionId: resources.motionId })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1)
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource nicht gefunden.' })
  }

  const [motion] = await db
    .select({ authorId: motions.authorId })
    .from(motions)
    .where(eq(motions.id, resource.motionId))
    .limit(1)

  const canModerate =
    (motion != null && user.id === motion.authorId) ||
    hasRequiredRole(user.role, 'moderator')
  if (!canModerate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Keine ausreichende Berechtigung.',
    })
  }

  const [updated] = await db
    .update(resources)
    .set({
      status: body.status,
      reviewedById: user.id,
      reviewedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning()

  await recordActivity({
    motionId: resource.motionId,
    actorId: user.id,
    type: body.status === 'accepted' ? 'resource_accepted' : 'resource_rejected',
    targetType: 'resource',
    targetId: id,
  })

  return { resource: updated }
})
