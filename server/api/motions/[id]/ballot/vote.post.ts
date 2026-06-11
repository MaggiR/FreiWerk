import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { ballots, ballotParticipants } from '../../../../database/schema'
import { ballotVoteSchema } from '../../../../utils/validation'
import { requireAuth } from '../../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, ballotVoteSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, ballotEndsAt: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (motion.status !== 'ballot') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Eine Stimmabgabe ist nur während der Abstimmungsphase möglich.',
    })
  }
  if (motion.ballotEndsAt && new Date(motion.ballotEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Abstimmungsfrist ist abgelaufen.',
    })
  }

  // One vote per member. The participation log records WHO voted; the ballot row
  // records the (anonymous) choice. They are written separately and never joined.
  const [already] = await db
    .select({ id: ballotParticipants.id })
    .from(ballotParticipants)
    .where(
      and(
        eq(ballotParticipants.motionId, id),
        eq(ballotParticipants.userId, user.id),
      ),
    )
    .limit(1)
  if (already) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Du hast in dieser Abstimmung bereits abgestimmt.',
    })
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(ballotParticipants)
        .values({ motionId: id, userId: user.id })
      await tx.insert(ballots).values({ motionId: id, choice: body.choice })
    })
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Du hast in dieser Abstimmung bereits abgestimmt.',
      })
    }
    throw err
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
