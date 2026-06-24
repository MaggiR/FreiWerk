import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { posts } from '../../../database/schema'
import { postCreateSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { requireAuth } from '../../../utils/auth'
import { persistReferences } from '../../../utils/references'
import { bodyContainsUrl } from '#shared/linkPreview'
import { buildLinkPreviewHtml, fetchLinkPreview } from '../../../utils/linkPreview'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, postCreateSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    columns: { id: true, status: true, debateEndsAt: true },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Posts are only allowed during an open debate phase.
  if (motion.status !== 'debate') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Beiträge sind nur während der Debattenphase möglich.',
    })
  }
  if (motion.debateEndsAt && new Date(motion.debateEndsAt).getTime() <= Date.now()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Debattenfrist ist abgelaufen.',
    })
  }

  // A reply must point at a non-deleted post of the same motion.
  if (body.parentId) {
    const [parent] = await db
      .select({ id: posts.id, deletedAt: posts.deletedAt })
      .from(posts)
      .where(and(eq(posts.id, body.parentId), eq(posts.motionId, id)))
      .limit(1)
    if (!parent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Der Beitrag, auf den du antwortest, wurde nicht gefunden.',
      })
    }
    if (parent.deletedAt) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Auf einen entfernten Beitrag kann nicht geantwortet werden.',
      })
    }
  }

  let bodyHtml = sanitizeRichText(body.bodyHtml)
  if (bodyHtml.trim().length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Der Beitrag darf nicht leer sein.',
    })
  }

  if (
    body.linkPreviewUrl
    && bodyContainsUrl(body.bodyHtml, body.linkPreviewUrl)
  ) {
    try {
      const preview = await fetchLinkPreview(body.linkPreviewUrl)
      bodyHtml = sanitizeRichText(bodyHtml + buildLinkPreviewHtml(preview))
    } catch {
      // Post without preview if unfurl fails.
    }
  }

  const [created] = await db
    .insert(posts)
    .values({
      motionId: id,
      authorId: user.id,
      parentId: body.parentId ?? null,
      bodyHtml,
    })
    .returning()

  if (body.references && body.references.length > 0) {
    await persistReferences({
      motionId: id,
      sourceType: 'post',
      sourceId: created!.id,
      references: body.references,
    })
  }

  setResponseStatus(event, 201)
  return { post: created }
})
