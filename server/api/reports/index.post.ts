import { and, eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { reports, motions, posts } from '../../database/schema'
import { reportCreateSchema } from '../../utils/validation'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, reportCreateSchema.parse)

  // The reported target must exist (and be visible) before we accept a report.
  if (body.targetType === 'motion') {
    const motion = await db.query.motions.findFirst({
      where: (m, { eq: eqOp }) => eqOp(m.id, body.targetId),
      columns: { id: true, status: true },
    })
    if (!motion || motion.status === 'draft') {
      throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
    }
  } else {
    const [post] = await db
      .select({ id: posts.id, deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.id, body.targetId))
      .limit(1)
    if (!post || post.deletedAt) {
      throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden.' })
    }
  }

  // One open report per member and target keeps the moderation queue clean.
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, user.id),
        eq(reports.targetType, body.targetType),
        eq(reports.targetId, body.targetId),
        eq(reports.status, 'open'),
      ),
    )
    .limit(1)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Du hast diesen Inhalt bereits gemeldet.',
    })
  }

  const [created] = await db
    .insert(reports)
    .values({
      reporterId: user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
    })
    .returning({ id: reports.id })

  setResponseStatus(event, 201)
  return { report: created }
})
