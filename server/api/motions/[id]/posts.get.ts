import { z } from 'zod'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts, users, elementReferences } from '../../../database/schema'
import { getUpvoteSummaries } from '../../../utils/upvotes'
import { getReferencePreviewsForSources } from '../../../utils/references'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id

  const rows = await db
    .select({
      id: posts.id,
      parentId: posts.parentId,
      bodyHtml: posts.bodyHtml,
      createdAt: posts.createdAt,
      deletedAt: posts.deletedAt,
      authorId: posts.authorId,
      authorName: users.displayName,
      authorFn: users.fn,
      authorRole: users.role,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.motionId, id))
    .orderBy(asc(posts.createdAt))

  const postIds = rows.map((r) => r.id)

  const upvotes = await getUpvoteSummaries('post', postIds, currentUserId)

  // Outgoing references (rendered as inline blocks on each message).
  const referencesByPost = await getReferencePreviewsForSources('post', postIds)

  // Inbound references whose target is a post in this motion → implicit threads.
  const inboundCounts = new Map<string, number>()
  if (postIds.length > 0) {
    const inbound = await db
      .select({ targetId: elementReferences.targetId })
      .from(elementReferences)
      .where(
        and(
          eq(elementReferences.targetType, 'post'),
          inArray(elementReferences.targetId, postIds),
        ),
      )
    for (const row of inbound) {
      inboundCounts.set(row.targetId, (inboundCounts.get(row.targetId) ?? 0) + 1)
    }
  }

  const sanitized = rows.map((row) => {
    const deleted = Boolean(row.deletedAt)
    const upvote = upvotes.get(row.id)
    return {
      id: row.id,
      parentId: row.parentId,
      createdAt: row.createdAt,
      deleted,
      bodyHtml: deleted ? '' : row.bodyHtml,
      authorId: deleted ? null : row.authorId,
      authorName: deleted ? null : row.authorName,
      authorFn: deleted ? null : row.authorFn,
      authorRole: deleted ? null : row.authorRole,
      authorAvatarUrl: deleted ? null : row.authorAvatarUrl,
      upvoteCount: deleted ? 0 : (upvote?.count ?? 0),
      upvotedByMe: deleted ? false : (upvote?.upvotedByMe ?? false),
      references: referencesByPost.get(row.id) ?? [],
      referencedByCount: inboundCounts.get(row.id) ?? 0,
    }
  })

  return { posts: sanitized }
})
