import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motions, motionVersions } from '../../../database/schema'
import { publishSchema } from '../../../utils/validation'
import { requireAuth } from '../../../utils/auth'
import { DEFAULT_DEBATE_DAYS } from '../../../../shared/constants'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, publishSchema.parse)

  const existing = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }
  if (existing.authorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung.' })
  }
  if (existing.status !== 'draft') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Nur Entwürfe können veröffentlicht werden.',
    })
  }

  const days = body.debateDays ?? DEFAULT_DEBATE_DAYS
  const now = new Date()
  const debateEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  // Publish and capture the v1 content snapshot atomically.
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(motions)
      .set({
        status: 'debate',
        publishedAt: now,
        debateEndsAt,
        currentVersion: 1,
        updatedAt: now,
      })
      .where(eq(motions.id, id))
      .returning()

    await tx.insert(motionVersions).values({
      motionId: id,
      versionNumber: 1,
      title: row.title,
      summary: row.summary,
      bodyHtml: row.bodyHtml,
      createdById: user.id,
    })

    return row
  })

  return { motion: updated }
})
