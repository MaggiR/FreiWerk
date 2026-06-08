import { eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { divisions, users } from '../../database/schema'
import { requireAuth } from '../../utils/auth'
import { profileUpdateSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readValidatedBody(event, profileUpdateSchema.parse)

  if (body.divisionId) {
    const division = await db.query.divisions.findFirst({
      where: (d, { eq: eqOp }) => eqOp(d.id, body.divisionId!),
      columns: { id: true },
    })
    if (!division) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Gliederung nicht gefunden.',
      })
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {}
  if (body.displayName !== undefined) updates.displayName = body.displayName
  if (body.fn !== undefined) updates.fn = body.fn
  if (body.divisionId !== undefined) updates.divisionId = body.divisionId
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, authUser.id))
    .returning({
      id: users.id,
      displayName: users.displayName,
      fn: users.fn,
      role: users.role,
      avatarUrl: users.avatarUrl,
      divisionId: users.divisionId,
      createdAt: users.createdAt,
    })

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Profil nicht gefunden.',
    })
  }

  const division = updated.divisionId
    ? await db.query.divisions.findFirst({
        where: (d, { eq: eqOp }) => eqOp(d.id, updated.divisionId!),
        columns: { id: true, name: true },
      })
    : null

  const session = await getUserSession(event)
  if (session.user) {
    await setUserSession(event, {
      ...session,
      user: {
        ...session.user,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
      },
    })
  }

  return {
    user: {
      id: updated.id,
      displayName: updated.displayName,
      fn: updated.fn,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
      division,
    },
  }
})
