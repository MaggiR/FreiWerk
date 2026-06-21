import { and, eq, lt, or } from 'drizzle-orm'
import { db } from '../database/client'
import { activityEvents } from '../database/schema'
import type { ActivityType } from '../database/schema'

const CURSOR_SEP = '|'

/** Encodes a stable pagination cursor for activity events (newest first). */
export function encodeActivityCursor(createdAt: string | Date, id: string): string {
  const iso = createdAt instanceof Date ? createdAt.toISOString() : createdAt
  return `${iso}${CURSOR_SEP}${id}`
}

export function parseActivityCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  const sep = cursor.lastIndexOf(CURSOR_SEP)
  if (sep <= 0) return null
  const createdAt = new Date(cursor.slice(0, sep))
  const id = cursor.slice(sep + 1)
  if (Number.isNaN(createdAt.getTime()) || !id) return null
  return { createdAt, id }
}

export function activityCursorWhere(cursor: string | undefined) {
  if (!cursor) return undefined
  const parsed = parseActivityCursor(cursor)
  if (!parsed) return undefined
  return or(
    lt(activityEvents.createdAt, parsed.createdAt),
    and(
      eq(activityEvents.createdAt, parsed.createdAt),
      lt(activityEvents.id, parsed.id),
    ),
  )
}

interface RecordActivityInput {
  motionId: string
  actorId: string | null
  type: ActivityType
  /** Loose reference to the element this event is about (no FK). */
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Append an entry to a motion's deliberation activity feed. Best-effort: a
 * logging failure must never break the primary action, so errors are swallowed
 * after being reported to the server console.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      motionId: input.motionId,
      actorId: input.actorId,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    })
  } catch (err) {
    console.error('[activity] Failed to record activity event:', err)
  }
}
