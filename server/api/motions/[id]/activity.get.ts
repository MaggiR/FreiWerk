import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../database/client'
import { activityEvents, motions, users } from '../../../database/schema'
import {
  activityCursorWhere,
  encodeActivityCursor,
  parseActivityCursor,
} from '../../../utils/activity'
import { activityListQuerySchema } from '../../../utils/validation'
import type { ActivityItem } from '../../../../shared/types'

const paramsSchema = z.object({ id: z.string().uuid() })

const DEBATE_START_TYPES = new Set(['debate_started', 'motion_published'])

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const query = await getValidatedQuery(event, activityListQuerySchema.parse)

  if (query.cursor && !parseActivityCursor(query.cursor)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Cursor.' })
  }

  const motion = await db.query.motions.findFirst({
    where: eq(motions.id, id),
    columns: {
      id: true,
      status: true,
      authorId: true,
      publishedAt: true,
    },
    with: {
      author: {
        columns: { displayName: true },
      },
    },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const cursorFilter = activityCursorWhere(query.cursor)
  const rows = await db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      actorId: activityEvents.actorId,
      actorName: users.displayName,
      targetType: activityEvents.targetType,
      targetId: activityEvents.targetId,
      metadata: activityEvents.metadata,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .leftJoin(users, eq(users.id, activityEvents.actorId))
    .where(
      cursorFilter
        ? and(eq(activityEvents.motionId, id), cursorFilter)
        : eq(activityEvents.motionId, id),
    )
    .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
    .limit(query.limit)

  const events: ActivityItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    actorId: row.actorId,
    actorName: row.actorName,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  }))

  if (!query.cursor) {
    const hasDebateStart = rows.some((row) => DEBATE_START_TYPES.has(row.type))
    if (motion.status !== 'draft' && motion.publishedAt && !hasDebateStart) {
      events.push({
        id: `debate-start-${motion.id}`,
        type: 'debate_started',
        actorId: motion.authorId,
        actorName: motion.author?.displayName ?? null,
        targetType: 'motion',
        targetId: motion.id,
        metadata: null,
        createdAt:
          motion.publishedAt instanceof Date
            ? motion.publishedAt.toISOString()
            : String(motion.publishedAt),
      })
      events.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
  }

  const lastRow = rows.at(-1)
  const nextCursor =
    rows.length === query.limit && lastRow
      ? encodeActivityCursor(lastRow.createdAt, lastRow.id)
      : null

  return { events, nextCursor }
})
