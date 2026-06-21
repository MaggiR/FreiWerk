import { desc, isNotNull, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../database/client'
import { users } from '../../database/schema'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'moderator')

  const bannedBy = alias(users, 'banned_by')
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      bannedAt: users.bannedAt,
      banReason: users.banReason,
      bannedById: users.bannedById,
      bannedByName: bannedBy.displayName,
    })
    .from(users)
    .leftJoin(bannedBy, eq(bannedBy.id, users.bannedById))
    .where(isNotNull(users.bannedAt))
    .orderBy(desc(users.bannedAt))

  return { users: rows }
})
