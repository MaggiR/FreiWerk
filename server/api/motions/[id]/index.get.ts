import { z } from 'zod'
import { db } from '../../../database/client'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const session = await getUserSession(event)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      author: {
        columns: { id: true, displayName: true, fn: true },
      },
      division: { columns: { id: true, name: true, slug: true } },
    },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Drafts are only visible to their author.
  if (motion.status === 'draft' && motion.authorId !== session.user?.id) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  return { motion }
})
