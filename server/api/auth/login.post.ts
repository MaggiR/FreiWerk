import { eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { users } from '../../database/schema'
import { loginSchema } from '../../utils/validation'
import { verifyUserPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1)

  // Generic error to avoid leaking which part was wrong.
  const invalid = () =>
    createError({
      statusCode: 401,
      statusMessage: 'E-Mail-Adresse oder Passwort ist falsch.',
    })

  if (!user) {
    // Still run a hash comparison to reduce timing side-channels.
    await verifyUserPassword('scrypt$00$00', body.password)
    throw invalid()
  }

  const ok = await verifyUserPassword(user.passwordHash, body.password)
  if (!ok) {
    throw invalid()
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    loggedInAt: new Date().toISOString(),
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  }
})
