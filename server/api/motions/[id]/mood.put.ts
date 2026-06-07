import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motions, moodVotes, moodVoteEvents } from '../../../database/schema'
import { moodVoteSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, moodVoteSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, debateEndsAt: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Abstimmen ist nur während der Debattenphase möglich.',
    })
  }
  if (motion.debateEndsAt && new Date(motion.debateEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Debattenfrist ist abgelaufen.',
    })
  }

  // Upsert current vote + append to the event log for the trend chart.
  await db
    .insert(moodVotes)
    .values({ motionId: id, userId: user.id, choice: body.choice })
    .onConflictDoUpdate({
      target: [moodVotes.motionId, moodVotes.userId],
      set: { choice: body.choice, updatedAt: new Date() },
    })

  await db.insert(moodVoteEvents).values({
    motionId: id,
    userId: user.id,
    choice: body.choice,
  })

  // Touch motion so "active" sort/activity reflects engagement.
  await db
    .update(motions)
    .set({ updatedAt: new Date() })
    .where(and(eq(motions.id, id)))

  return { ok: true, choice: body.choice }
})
