import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { users } from '../../../database/schema'
import { magicLinkVerifySchema } from '../../../utils/validation'
import { toSessionUser } from '../../../utils/auth'
import { consumeMagicLinkToken } from '../../../utils/magicLink'

/**
 * Redeem a magic-link token: find or lazily create the account, then open a
 * session. New accounts are flagged for onboarding (no display name set yet).
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, magicLinkVerifySchema.parse)

  const consumed = await consumeMagicLinkToken(body.token)
  if (!consumed) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Dieser Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen an.',
    })
  }

  const { email, redirectPath } = consumed

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    // Lazily create a passwordless account; onboarding fills in real data.
    const placeholderName = email.split('@')[0]?.slice(0, 120) || 'Neues Mitglied'
    const [created] = await db
      .insert(users)
      .values({
        email,
        displayName: placeholderName,
        role: 'member',
      })
      .returning()
    user = created
  }

  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Anmeldung fehlgeschlagen.',
    })
  }

  if (user.bannedAt) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Dein Konto wurde gesperrt. Bitte wende dich an die Moderation.',
    })
  }

  const sessionUser = toSessionUser(user)
  await setUserSession(event, {
    user: sessionUser,
    loggedInAt: new Date().toISOString(),
  })

  return {
    user: sessionUser,
    needsOnboarding: sessionUser.needsOnboarding,
    redirect: redirectPath,
  }
})
