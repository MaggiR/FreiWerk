import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { UserRole } from '../database/schema'
import { db } from '../database/client'
import { users } from '../database/schema'
import { hasRequiredRole } from './authRole'

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: UserRole
}

/**
 * Require an authenticated session whose user still exists in the database.
 * Stale sessions (e.g. after a DB reseed) are cleared and rejected with 401.
 */
export async function requireAuth(event: H3Event): Promise<SessionUser> {
  const session = await requireUserSession(event)
  const sessionUser = session.user as SessionUser

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1)

  if (!dbUser) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Sitzung abgelaufen. Bitte erneut anmelden.',
    })
  }

  return dbUser
}

/**
 * Require the authenticated user to have at least the given role.
 * Throws 401 if unauthenticated, 403 if the role is insufficient.
 */
export async function requireRole(
  event: H3Event,
  minRole: UserRole,
): Promise<SessionUser> {
  const user = await requireAuth(event)
  if (!hasRequiredRole(user.role, minRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Keine ausreichende Berechtigung.',
    })
  }
  return user
}
