import { eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { users } from '../../database/schema'
import { requireAuth, toSessionUser } from '../../utils/auth'
import { onboardingSchema } from '../../utils/validation'

/**
 * Complete the initial profile setup after the first magic-link login. Composes
 * the display name from first/last name, stores the optional function and avatar,
 * and marks the account as onboarded so the setup flow is not shown again.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readValidatedBody(event, onboardingSchema.parse)

  const displayName = `${body.firstName} ${body.lastName}`.trim().slice(0, 120)

  const [updated] = await db
    .update(users)
    .set({
      displayName,
      fn: body.fn ?? null,
      avatarUrl: body.avatarUrl ?? null,
      onboardedAt: new Date(),
    })
    .where(eq(users.id, authUser.id))
    .returning()

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Profil nicht gefunden.',
    })
  }

  const sessionUser = toSessionUser(updated)
  const session = await getUserSession(event)
  await setUserSession(event, {
    ...session,
    user: sessionUser,
  })

  return { user: sessionUser }
})
