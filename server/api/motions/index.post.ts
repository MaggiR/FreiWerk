import { db } from '../../database/client'
import { motions } from '../../database/schema'
import { motionCreateSchema } from '../../utils/validation'
import { sanitizeRichText } from '../../utils/sanitize'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, motionCreateSchema.parse)

  const bodyHtml = sanitizeRichText(body.bodyHtml)
  if (bodyHtml.trim().length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Der Antragstext darf nicht leer sein.',
    })
  }

  const [created] = await db
    .insert(motions)
    .values({
      authorId: user.id,
      title: body.title,
      summary: body.summary,
      bodyHtml,
      topic: body.topic,
      divisionId: body.divisionId ?? null,
      isAnonymous: body.isAnonymous ?? false,
      status: 'draft',
    })
    .returning()

  setResponseStatus(event, 201)
  return { motion: created }
})
