import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionArguments, motions } from '../../../database/schema'
import { argumentCreateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'
import { hasRequiredRole } from '../../../utils/authRole'
import { recordActivity } from '../../../utils/activity'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, argumentCreateSchema.parse)

  const [motion] = await db
    .select({
      id: motions.id,
      authorId: motions.authorId,
      status: motions.status,
      debateEndsAt: motions.debateEndsAt,
    })
    .from(motions)
    .where(eq(motions.id, id))
    .limit(1)
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Arguments may only be added during an open debate phase.
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Argumente sind nur während der Debattenphase möglich.',
    })
  }
  if (motion.debateEndsAt && new Date(motion.debateEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Debattenfrist ist abgelaufen.',
    })
  }

  const bodyHtml = sanitizeRichText(body.bodyHtml)
  if (bodyHtml.trim().length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Das Argument darf nicht leer sein.',
    })
  }

  // The motion author and moderators publish directly; members propose.
  const canModerate =
    user.id === motion.authorId || hasRequiredRole(user.role, 'moderator')
  const accepted = canModerate

  const [created] = await db
    .insert(motionArguments)
    .values({
      motionId: id,
      authorId: user.id,
      stance: body.stance,
      title: body.title,
      bodyHtml,
      status: accepted ? 'accepted' : 'proposed',
      reviewedById: accepted ? user.id : null,
      reviewedAt: accepted ? new Date() : null,
    })
    .returning()

  await recordActivity({
    motionId: id,
    actorId: user.id,
    type: accepted ? 'argument_accepted' : 'argument_proposed',
    targetType: 'argument',
    targetId: created!.id,
    metadata: { stance: body.stance, title: body.title },
  })

  setResponseStatus(event, 201)
  return { argument: created }
})
