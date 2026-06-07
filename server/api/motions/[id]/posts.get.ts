import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts, users } from '../../../database/schema'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const rows = await db
    .select({
      id: posts.id,
      bodyHtml: posts.bodyHtml,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.displayName,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.motionId, id))
    .orderBy(asc(posts.createdAt))

  return { posts: rows }
})
