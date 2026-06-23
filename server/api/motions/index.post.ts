import { db } from '../../database/client'
import { motions } from '../../database/schema'
import { motionDraftSaveSchema } from '../../utils/validation'
import { normalizeDraftBodyHtml, resolveDraftTopic } from '../../utils/motionDraft'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, motionDraftSaveSchema.parse)

  const [created] = await db
    .insert(motions)
    .values({
      authorId: user.id,
      title: body.title ?? '',
      summary: body.summary ?? '',
      bodyHtml: normalizeDraftBodyHtml(body.bodyHtml ?? ''),
      topic: resolveDraftTopic(body.topic),
      divisionId: body.divisionId ?? null,
      isAnonymous: body.isAnonymous ?? false,
      status: 'draft',
    })
    .returning()

  setResponseStatus(event, 201)
  return { motion: created }
})
