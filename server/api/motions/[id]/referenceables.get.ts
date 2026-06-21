import { z } from 'zod'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../../../database/client'
import {
  motions,
  motionArguments,
  questions,
  answers,
  resources,
  posts,
} from '../../../database/schema'
import type { ReferenceTargetType } from '../../../database/schema'

const paramsSchema = z.object({ id: z.string().uuid() })

interface Referenceable {
  targetType: ReferenceTargetType
  targetId: string
  label: string
}

function snippet(html: string, max = 90): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const motion = await db.query.motions.findFirst({
    where: eq(motions.id, id),
    columns: { id: true },
  })
  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  const items: Referenceable[] = []

  const argRows = await db
    .select({ id: motionArguments.id, title: motionArguments.title })
    .from(motionArguments)
    .where(
      and(eq(motionArguments.motionId, id), eq(motionArguments.status, 'accepted')),
    )
    .orderBy(desc(motionArguments.createdAt))
  for (const row of argRows) {
    items.push({ targetType: 'argument', targetId: row.id, label: row.title })
  }

  const qRows = await db
    .select({ id: questions.id, title: questions.title })
    .from(questions)
    .where(eq(questions.motionId, id))
    .orderBy(desc(questions.createdAt))
  for (const row of qRows) {
    items.push({ targetType: 'question', targetId: row.id, label: row.title })
  }

  const aRows = await db
    .select({ id: answers.id, bodyHtml: answers.bodyHtml })
    .from(answers)
    .where(eq(answers.motionId, id))
    .orderBy(desc(answers.createdAt))
  for (const row of aRows) {
    items.push({ targetType: 'answer', targetId: row.id, label: snippet(row.bodyHtml) })
  }

  const rRows = await db
    .select({ id: resources.id, title: resources.title })
    .from(resources)
    .where(and(eq(resources.motionId, id), eq(resources.status, 'accepted')))
    .orderBy(desc(resources.createdAt))
  for (const row of rRows) {
    items.push({ targetType: 'resource', targetId: row.id, label: row.title })
  }

  const pRows = await db
    .select({ id: posts.id, bodyHtml: posts.bodyHtml })
    .from(posts)
    .where(and(eq(posts.motionId, id), isNull(posts.deletedAt)))
    .orderBy(asc(posts.createdAt))
  for (const row of pRows) {
    items.push({ targetType: 'post', targetId: row.id, label: snippet(row.bodyHtml) })
  }

  return { items }
})
