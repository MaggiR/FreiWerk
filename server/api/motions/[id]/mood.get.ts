import { z } from 'zod'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { moodVotes, moodVoteEvents } from '../../../database/schema'
import {
  appendTerminalTrendPoint,
  buildMoodTrend,
  type MoodCounts,
} from '../../../utils/moodTrend'
import { MOOD_POLL_CHOICES, type MoodChoiceValue } from '../../../../shared/constants'

const paramsSchema = z.object({ id: z.string().uuid() })

function emptyCounts(): MoodCounts {
  return { approve: 0, reject: 0, abstain: 0, undecided: 0 }
}

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)

  // Current distribution (source of truth: one row per user).
  const aggregateRows = await db
    .select({ choice: moodVotes.choice, count: sql<number>`count(*)::int` })
    .from(moodVotes)
    .where(eq(moodVotes.motionId, id))
    .groupBy(moodVotes.choice)

  const totals = emptyCounts()
  for (const row of aggregateRows) {
    totals[row.choice as MoodChoiceValue] = row.count
  }
  const totalVotes = MOOD_POLL_CHOICES.reduce((sum, c) => sum + totals[c], 0)

  // Accurate trend: replay events, tracking each user's latest choice.
  const events = await db
    .select({
      userId: moodVoteEvents.userId,
      choice: moodVoteEvents.choice,
      createdAt: moodVoteEvents.createdAt,
    })
    .from(moodVoteEvents)
    .where(eq(moodVoteEvents.motionId, id))
    .orderBy(asc(moodVoteEvents.createdAt))

  const trend = appendTerminalTrendPoint(
    buildMoodTrend(
      events.map((event) => ({
        userId: event.userId,
        choice: event.choice as MoodChoiceValue,
        createdAt: new Date(event.createdAt),
      })),
    ),
    {
      approve: totals.approve,
      reject: totals.reject,
      abstain: totals.abstain,
    },
  )

  // Current user's own vote (if authenticated).
  let userChoice: MoodChoiceValue | null = null
  if (session.user?.id) {
    const [own] = await db
      .select({ choice: moodVotes.choice })
      .from(moodVotes)
      .where(
        and(eq(moodVotes.motionId, id), eq(moodVotes.userId, session.user.id)),
      )
      .limit(1)
    userChoice = (own?.choice as MoodChoiceValue) ?? null
  }

  return { totals, totalVotes, trend, userChoice }
})
