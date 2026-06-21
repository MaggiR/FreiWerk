import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { resources, motions } from '../../../database/schema'
import { resourceCreateSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, resourceCreateSchema.parse)

  const [motion] = await db
    .select({
      id: motions.id,
      authorId: motions.authorId,
      status: motions.status,
    })
    .from(motions)
    .where(eq(motions.id, id))
    .limit(1)
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (motion.status === 'draft') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ressourcen können erst nach Veröffentlichung vorgeschlagen werden.',
    })
  }

  // The motion author and moderators add directly; members propose.
  const canModerate =
    user.id === motion.authorId || hasRequiredRole(user.role, 'moderator')
  const accepted = canModerate

  const [created] = await db
    .insert(resources)
    .values({
      motionId: id,
      authorId: user.id,
      title: body.title,
      description: body.description ?? null,
      kind: body.kind,
      url: body.url,
      status: accepted ? 'accepted' : 'proposed',
      reviewedById: accepted ? user.id : null,
      reviewedAt: accepted ? new Date() : null,
    })
    .returning()

  await recordActivity({
    motionId: id,
    actorId: user.id,
    type: accepted ? 'resource_accepted' : 'resource_proposed',
    targetType: 'resource',
    targetId: created!.id,
    metadata: { title: body.title, kind: body.kind },
  })

  setResponseStatus(event, 201)
  return { resource: created }
})
