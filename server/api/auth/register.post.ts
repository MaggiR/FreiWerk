import { eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { users } from '../../database/schema'
import { registerSchema } from '../../utils/validation'
import { hashUserPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail-Adresse ist bereits registriert.',
    })
  }

  const passwordHash = await hashUserPassword(body.password)

  const [created] = await db
    .insert(users)
    .values({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      role: 'member',
    })
    .returning()

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Registrierung fehlgeschlagen.',
    })
  }

  await setUserSession(event, {
    user: {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      role: created.role,
    },
    loggedInAt: new Date().toISOString(),
  })

  setResponseStatus(event, 201)
  return {
    user: {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      role: created.role,
    },
  }
})
