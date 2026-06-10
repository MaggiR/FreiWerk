import type { UserRole } from '../database/schema'

const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
}

/**
 * Pure role check: does `userRole` meet or exceed `minRole`?
 * Kept separate from auth.ts so unit tests do not load the database client.
 */
export function hasRequiredRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}
