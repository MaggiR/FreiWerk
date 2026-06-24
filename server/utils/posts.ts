import { and, eq, inArray, or } from 'drizzle-orm'
import { POST_EDIT_WINDOW_MS } from '#shared/constants'
import type { ReferencePreview } from '#shared/types'
import { db } from '../database/client'
import {
  elementReferences,
  elementUpvotes,
  postSaves,
  posts,
  reports,
} from '../database/schema'

export function isWithinPostEditWindow(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() <= POST_EDIT_WINDOW_MS
}

/** Count inbound references per post (explicit post refs + direct replies, deduped). */
export function buildInboundReferenceCounts(
  rows: Array<{ id: string; parentId: string | null; deletedAt: Date | null }>,
  referencesByPost: Map<string, ReferencePreview[]>,
): Map<string, number> {
  const sets = new Map<string, Set<string>>()

  function add(targetId: string, sourceId: string, sourceDeleted: boolean) {
    if (sourceDeleted) return
    let set = sets.get(targetId)
    if (!set) {
      set = new Set()
      sets.set(targetId, set)
    }
    set.add(sourceId)
  }

  for (const row of rows) {
    const deleted = Boolean(row.deletedAt)
    if (row.parentId) {
      add(row.parentId, row.id, deleted)
    }
    for (const ref of referencesByPost.get(row.id) ?? []) {
      if (ref.targetType !== 'post') continue
      add(ref.targetId, row.id, deleted)
    }
  }

  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.id, sets.get(row.id)?.size ?? 0)
  }
  return counts
}

/** Remove a post and all traces (author delete). Replies cascade via FK. */
export async function hardDeletePost(postId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(elementUpvotes)
      .where(
        and(
          eq(elementUpvotes.targetType, 'post'),
          eq(elementUpvotes.targetId, postId),
        ),
      )

    await tx
      .delete(elementReferences)
      .where(
        or(
          and(
            eq(elementReferences.sourceType, 'post'),
            eq(elementReferences.sourceId, postId),
          ),
          and(
            eq(elementReferences.targetType, 'post'),
            eq(elementReferences.targetId, postId),
          ),
        ),
      )

    await tx.delete(postSaves).where(eq(postSaves.postId, postId))

    await tx
      .delete(reports)
      .where(and(eq(reports.targetType, 'post'), eq(reports.targetId, postId)))

    await tx.delete(posts).where(eq(posts.id, postId))
  })
}

export async function getPostSaveFlags(
  postIds: string[],
  userId?: string,
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  for (const id of postIds) {
    result.set(id, false)
  }
  if (!userId || postIds.length === 0) {
    return result
  }

  const rows = await db
    .select({ postId: postSaves.postId })
    .from(postSaves)
    .where(and(inArray(postSaves.postId, postIds), eq(postSaves.userId, userId)))

  for (const row of rows) {
    result.set(row.postId, true)
  }

  return result
}
