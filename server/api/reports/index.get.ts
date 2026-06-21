import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../database/client'
import { reports, posts, users } from '../../database/schema'
import { reportListQuerySchema } from '../../utils/validation'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'moderator')
  const query = await getValidatedQuery(event, reportListQuerySchema.parse)

  const reporter = users
  const rows = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporterId: reports.reporterId,
      reporterName: reporter.displayName,
    })
    .from(reports)
    .leftJoin(reporter, eq(reporter.id, reports.reporterId))
    .where(query.status ? eq(reports.status, query.status) : undefined)
    .orderBy(desc(reports.createdAt))

  // Resolve the motion a post belongs to so the UI can link to it.
  const postTargetIds = rows
    .filter((r) => r.targetType === 'post')
    .map((r) => r.targetId)
  const postMotionMap = new Map<string, string>()
  if (postTargetIds.length > 0) {
    const postRows = await db
      .select({ id: posts.id, motionId: posts.motionId })
      .from(posts)
      .where(inArray(posts.id, postTargetIds))
    for (const row of postRows) postMotionMap.set(row.id, row.motionId)
  }

  const result = rows.map((r) => ({
    ...r,
    motionId: r.targetType === 'motion' ? r.targetId : (postMotionMap.get(r.targetId) ?? null),
  }))

  return { reports: result }
})
