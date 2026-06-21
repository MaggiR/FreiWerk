import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { reports } from '../../../database/schema'
import { reportResolveSchema } from '../../../utils/validation'
import { requireRole } from '../../../utils/auth'
import { recordModerationAction } from '../../../utils/audit'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'moderator')
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, reportResolveSchema.parse)

  const report = await db.query.reports.findFirst({
    where: (r, { eq: eqOp }) => eqOp(r.id, id),
    columns: { id: true, status: true, targetType: true, targetId: true },
  })
  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Meldung nicht gefunden.' })
  }
  if (report.status !== 'open') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Meldung wurde bereits bearbeitet.',
    })
  }

  const status = body.action === 'resolve' ? 'resolved' : 'dismissed'

  const [updated] = await db
    .update(reports)
    .set({
      status,
      resolvedById: user.id,
      resolutionNote: body.resolutionNote,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, id))
    .returning()

  await recordModerationAction({
    actorId: user.id,
    action: body.action === 'resolve' ? 'report_resolved' : 'report_dismissed',
    targetType: 'report',
    targetId: id,
    reason: body.resolutionNote,
    metadata: {
      reportTargetType: report.targetType,
      reportTargetId: report.targetId,
    },
  })

  return { report: updated }
})
