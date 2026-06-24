import { z } from 'zod'
import { requireAuth } from '../utils/auth'
import { consumeLinkPreviewRateLimit, fetchLinkPreview } from '../utils/linkPreview'

const querySchema = z.object({
  url: z.string().min(1).max(2000),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { url } = await getValidatedQuery(event, querySchema.parse)

  if (!consumeLinkPreviewRateLimit(user.id)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Vorschau-Anfragen. Bitte kurz warten.',
    })
  }

  const preview = await fetchLinkPreview(url)
  return { preview }
})
