import { z } from 'zod'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts, users } from '../../../database/schema'
import { postListQuerySchema } from '../../../utils/validation'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const query = await getValidatedQuery(event, postListQuerySchema.parse)
  const order = query.sort === 'oldest' ? asc(posts.createdAt) : desc(posts.createdAt)

  const rows = await db
    .select({
      id: posts.id,
      bodyHtml: posts.bodyHtml,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.displayName,
      authorFn: users.fn,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.motionId, id))
    .orderBy(order)

  return { posts: rows }
})
