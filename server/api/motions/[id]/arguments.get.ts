import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { motionArguments, motions, users } from '../../../database/schema'
import { hasRequiredRole } from '../../../utils/authRole'
import { getUpvoteSummaries } from '../../../utils/upvotes'
import type { ArgumentItem } from '../../../../shared/types'

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
      id: motionArguments.id,
      stance: motionArguments.stance,
      title: motionArguments.title,
      bodyHtml: motionArguments.bodyHtml,
      status: motionArguments.status,
      deliberationStatus: motionArguments.deliberationStatus,
      authorId: motionArguments.authorId,
      authorName: users.displayName,
      createdAt: motionArguments.createdAt,
    })
    .from(motionArguments)
    .leftJoin(users, eq(users.id, motionArguments.authorId))
    .where(eq(motionArguments.motionId, id))
    .orderBy(desc(motionArguments.createdAt))

  // Accepted arguments are public; proposed/rejected only for moderators or the
  // member who proposed them.
  const visible = rows.filter(
    (row) =>
      row.status === 'accepted' ||
      canModerate ||
      (currentUserId != null && row.authorId === currentUserId),
  )

  const upvotes = await getUpvoteSummaries(
    'argument',
    visible.map((r) => r.id),
    currentUserId,
  )

  const items: ArgumentItem[] = visible.map((row) => {
    const upvote = upvotes.get(row.id)
    return {
      id: row.id,
      stance: row.stance,
      title: row.title,
      bodyHtml: row.bodyHtml,
      status: row.status,
      deliberationStatus: row.deliberationStatus,
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

  return { arguments: items, canModerate }
})
