import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { motions, ballots } from '../../../../database/schema'
import { requireAuth } from '../../../../utils/auth'
import { hasRequiredRole } from '../../../../utils/authRole'
import { computeBallotOutcome, emptyBallotCounts } from '../../../../utils/ballot'
import type { BallotChoice } from '../../../../database/schema'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, authorId: true, status: true, ballotEndsAt: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  // The author or a moderator may finalize the ballot.
  const isAuthor = motion.authorId === user.id
  if (!isAuthor && !hasRequiredRole(user.role, 'moderator')) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (motion.status !== 'ballot') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Es läuft keine Abstimmung, die ausgewertet werden könnte.',
    })
  }
  if (motion.ballotEndsAt && new Date(motion.ballotEndsAt).getTime() > Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Abstimmungsfrist läuft noch.',
    })
  }

  const aggregateRows = await db
    .select({ choice: ballots.choice, count: sql<number>`count(*)::int` })
    .from(ballots)
    .where(eq(ballots.motionId, id))
    .groupBy(ballots.choice)

  const counts = emptyBallotCounts()
  for (const row of aggregateRows) {
    counts[row.choice as BallotChoice] = row.count
  }

  const outcome = computeBallotOutcome(counts)

  const [updated] = await db
    .update(motions)
    .set({ status: 'decided', outcome, updatedAt: new Date() })
    .where(eq(motions.id, id))
    .returning()

  return { motion: updated, outcome, counts }
})
