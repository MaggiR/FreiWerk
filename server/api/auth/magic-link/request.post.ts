import { eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { users } from '../../../database/schema'
import { magicLinkRequestSchema } from '../../../utils/validation'
import { toSessionUser } from '../../../utils/auth'
import {
  issueMagicLinkToken,
  pruneExpiredMagicLinkTokens,
} from '../../../utils/magicLink'
import { sendMagicLinkEmail } from '../../../utils/email'
import { DEMO_EMAIL, MAGIC_LINK_TTL_MINUTES } from '../../../../shared/constants'

/**
 * Start a passwordless login. The demo account logs in immediately; every other
 * address receives a single-use magic link by email. The response never reveals
 * whether an account exists for a given address.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, magicLinkRequestSchema.parse)
  const email = body.email
  const redirect = body.redirect ?? null

  // Demo shortcut: log straight into the shared demo profile (no email sent).
  if (email === DEMO_EMAIL) {
    const [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1)

    if (!demoUser) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'Der Demo-Account ist nicht eingerichtet. Bitte die Demodaten laden.',
      })
    }

    if (demoUser.bannedAt) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Der Demo-Account ist gesperrt.',
      })
    }

    await setUserSession(event, {
      user: toSessionUser(demoUser),
      loggedInAt: new Date().toISOString(),
    })

    return { mode: 'demo' as const, loggedIn: true }
  }

  // Opportunistic cleanup so the token table does not grow unbounded.
  await pruneExpiredMagicLinkTokens().catch(() => {})

  const issued = await issueMagicLinkToken(email, redirect)

  // When throttled (issued === null) we silently report success to the client.
  if (issued) {
    const origin = getRequestURL(event).origin
    const url = `${origin}/auth/verify?token=${encodeURIComponent(issued.token)}`
    try {
      await sendMagicLinkEmail({
        to: email,
        url,
        ttlMinutes: MAGIC_LINK_TTL_MINUTES,
      })
    } catch (err) {
      console.error('[magic-link] Failed to send login email:', err)
      throw createError({
        statusCode: 502,
        statusMessage:
          'Die Anmelde-E-Mail konnte nicht versendet werden. Bitte später erneut versuchen.',
      })
    }
  }

  return { mode: 'magic-link' as const, sent: true }
})
