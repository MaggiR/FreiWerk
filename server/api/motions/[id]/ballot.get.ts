import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { ballots, ballotParticipants } from '../../../database/schema'
import { emptyBallotCounts } from '../../../utils/ballot'
import type { BallotChoice } from '../../../database/schema'
import { BALLOT_CHOICES } from '../../../../shared/constants'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: {
      id: true,
      status: true,
      ballotStartedAt: true,
      ballotEndsAt: true,
      outcome: true,
    },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const [participantRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ballotParticipants)
    .where(eq(ballotParticipants.motionId, id))
  const participantCount = participantRow?.count ?? 0

  let hasVoted = false
  if (currentUserId) {
    const [own] = await db
      .select({ id: ballotParticipants.id })
      .from(ballotParticipants)
      .where(
        and(
          eq(ballotParticipants.motionId, id),
          eq(ballotParticipants.userId, currentUserId),
        ),
      )
      .limit(1)
    hasVoted = Boolean(own)
  }

  // Tally is secret until the ballot is finalized; only "decided" motions reveal it.
  let totals: ReturnType<typeof emptyBallotCounts> | null = null
  let totalVotes = 0
  if (motion.status === 'decided') {
    const aggregateRows = await db
      .select({ choice: ballots.choice, count: sql<number>`count(*)::int` })
      .from(ballots)
      .where(eq(ballots.motionId, id))
      .groupBy(ballots.choice)

    const counts = emptyBallotCounts()
    for (const row of aggregateRows) {
      counts[row.choice as BallotChoice] = row.count
    }
    totals = counts
    totalVotes = BALLOT_CHOICES.reduce((sum, c) => sum + counts[c], 0)
  }

  return {
    status: motion.status,
    ballotStartedAt: motion.ballotStartedAt,
    ballotEndsAt: motion.ballotEndsAt,
    outcome: motion.outcome,
    participantCount,
    hasVoted,
    totals,
    totalVotes,
  }
})
