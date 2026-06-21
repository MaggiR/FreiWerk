import { db } from '../database/client'
import { moderationActions } from '../database/schema'
import type {
  ModerationActionType,
  ModerationTargetType,
} from '../database/schema'

interface RecordModerationActionInput {
  actorId: string | null
  action: ModerationActionType
  targetType: ModerationTargetType
  targetId: string
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Append a moderative/administrative action to the audit log. Best-effort: a
 * logging failure must never break the primary action, so errors are swallowed
 * after being reported to the server console.
 *
 * Never pass ballot data here — the audit log must stay disjoint from votes.
 */
export async function recordModerationAction(
  input: RecordModerationActionInput,
): Promise<void> {
  try {
    await db.insert(moderationActions).values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
      metadata: input.metadata ?? null,
    })
  } catch (err) {
    console.error('[audit] Failed to record moderation action:', err)
  }
}
