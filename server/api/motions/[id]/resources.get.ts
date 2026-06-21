import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { resources, motions, users } from '../../../database/schema'
import { hasRequiredRole } from '../../../utils/authRole'
import { getUpvoteSummaries } from '../../../utils/upvotes'
import type { ResourceItem } from '../../../../shared/types'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)
  const currentUserId = session.user?.id
  const currentRole = session.user?.role

  const motion = await db.query.motions.findFirst({
    where: eq(motions.id, id),
    columns: { id: true, authorId: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const canModerate =
    (currentUserId != null && currentUserId === motion.authorId) ||
    (currentRole != null && hasRequiredRole(currentRole, 'moderator'))

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      kind: resources.kind,
      url: resources.url,
      status: resources.status,
      authorId: resources.authorId,
      authorName: users.displayName,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .leftJoin(users, eq(users.id, resources.authorId))
    .where(eq(resources.motionId, id))
    .orderBy(desc(resources.createdAt))

  // Accepted resources are public; proposed/rejected only for moderators or the
  // member who proposed them.
  const visible = rows.filter(
    (row) =>
      row.status === 'accepted' ||
      canModerate ||
      (currentUserId != null && row.authorId === currentUserId),
  )

  const upvotes = await getUpvoteSummaries(
    'resource',
    visible.map((r) => r.id),
    currentUserId,
  )

  const items: ResourceItem[] = visible.map((row) => {
    const upvote = upvotes.get(row.id)
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      kind: row.kind,
      url: row.url,
      status: row.status,
      authorId: row.authorId,
      authorName: row.authorName,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      upvoteCount: upvote?.count ?? 0,
      upvotedByMe: upvote?.upvotedByMe ?? false,
      isMine: currentUserId != null && row.authorId === currentUserId,
    }
  })

  return { resources: items, canModerate }
})
