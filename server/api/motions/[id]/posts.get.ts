import { z } from 'zod'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts, postReactions, users } from '../../../database/schema'
import { aggregatePostReactions } from '../../../utils/postReactions'

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
      authorAvatarUrl: users.avatarUrl,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.motionId, id))
    .orderBy(asc(posts.createdAt))

  const postIds = rows.map((r) => r.id)
  let reactionRows: { postId: string; emoji: string; userId: string }[] = []
  if (postIds.length > 0) {
    reactionRows = await db
      .select({
        postId: postReactions.postId,
        emoji: postReactions.emoji,
        userId: postReactions.userId,
      })
      .from(postReactions)
      .where(inArray(postReactions.postId, postIds))
  }
  const reactionsByPost = aggregatePostReactions(reactionRows, currentUserId)

  const sanitized = rows.map((row) => {
    const deleted = Boolean(row.deletedAt)
    return {
      id: row.id,
      parentId: row.parentId,
      createdAt: row.createdAt,
      deleted,
      bodyHtml: deleted ? '' : row.bodyHtml,
      authorId: deleted ? null : row.authorId,
      authorName: deleted ? null : row.authorName,
      authorFn: deleted ? null : row.authorFn,
      authorAvatarUrl: deleted ? null : row.authorAvatarUrl,
      reactions: deleted ? [] : (reactionsByPost.get(row.id) ?? []),
    }
  })

  return { posts: sanitized }
})
