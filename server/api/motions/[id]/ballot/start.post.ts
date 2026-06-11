import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { motions } from '../../../../database/schema'
import { ballotStartSchema } from '../../../../utils/validation'
import { requireAuth } from '../../../../utils/auth'
import { DEFAULT_BALLOT_DAYS } from '../../../../../shared/constants'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, ballotStartSchema.parse)

  const existing = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, authorId: true, status: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  // Only the author may move their motion into the formal ballot phase.
  if (existing.authorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (existing.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Nur Anträge in der Debattenphase können zur Abstimmung gestellt werden.',
    })
  }

  const days = body.ballotDays ?? DEFAULT_BALLOT_DAYS
  const now = new Date()
  const ballotEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const [updated] = await db
    .update(motions)
    .set({
      status: 'ballot',
      ballotStartedAt: now,
      ballotEndsAt,
      updatedAt: now,
    })
    .where(eq(motions.id, id))
    .returning()

  return { motion: updated }
})
