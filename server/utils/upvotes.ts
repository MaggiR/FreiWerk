import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../database/client'
import {
  elementUpvotes,
  posts,
  motionArguments,
  questions,
  answers,
  resources,
  type UpvoteTargetType,
} from '../database/schema'

export interface UpvoteSummary {
  count: number
  upvotedByMe: boolean
}

/**
 * Aggregate upvote counts (and whether the current user upvoted) for many targets
 * of a single type. Targets without any upvote still get a zeroed entry.
 */
export async function getUpvoteSummaries(
  targetType: UpvoteTargetType,
  targetIds: string[],
  currentUserId: string | undefined,
): Promise<Map<string, UpvoteSummary>> {
  const result = new Map<string, UpvoteSummary>()
  for (const id of targetIds) {
    result.set(id, { count: 0, upvotedByMe: false })
  }
  if (targetIds.length === 0) return result

  const rows = await db
    .select({
      targetId: elementUpvotes.targetId,
      userId: elementUpvotes.userId,
    })
    .from(elementUpvotes)
    .where(
      and(
        eq(elementUpvotes.targetType, targetType),
        inArray(elementUpvotes.targetId, targetIds),
      ),
    )

  for (const row of rows) {
    const summary = result.get(row.targetId)
    if (!summary) continue
    summary.count += 1
    if (currentUserId && row.userId === currentUserId) {
      summary.upvotedByMe = true
    }
  }
  return result
}

/**
 * Verify an upvote target exists and return the motion it belongs to (for scoping
 * and lifecycle checks). Returns null when the target is missing or not upvotable
 * (e.g. a removed post).
 */
export async function resolveUpvoteTargetMotion(
  targetType: UpvoteTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case 'post': {
      const [row] = await db
        .select({ motionId: posts.motionId, deletedAt: posts.deletedAt })
        .from(posts)
        .where(eq(posts.id, targetId))
        .limit(1)
      if (!row || row.deletedAt) return null
      return row.motionId
    }
    case 'argument': {
      const [row] = await db
        .select({ motionId: motionArguments.motionId })
        .from(motionArguments)
        .where(eq(motionArguments.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'question': {
      const [row] = await db
        .select({ motionId: questions.motionId })
        .from(questions)
        .where(eq(questions.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'answer': {
      const [row] = await db
        .select({ motionId: answers.motionId })
        .from(answers)
        .where(eq(answers.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'resource': {
      const [row] = await db
        .select({ motionId: resources.motionId })
        .from(resources)
        .where(eq(resources.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
  }
}
