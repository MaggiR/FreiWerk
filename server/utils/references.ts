import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../database/client'
import {
  elementReferences,
  posts,
  users,
  motionArguments,
  questions,
  answers,
  resources,
  motions,
} from '../database/schema'
import type {
  ReferenceTargetType,
  ReferenceSourceType,
} from '../database/schema'
import type { ReferencePreview } from '../../shared/types'

export interface ReferenceInput {
  targetType: ReferenceTargetType
  targetId: string
  excerptText?: string
  excerptVersion?: number
}

/** Strip HTML tags and collapse whitespace into a short plain-text snippet. */
function snippet(html: string, max = 90): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Resolve the motion a reference target belongs to (null if it doesn't exist). */
async function resolveTargetMotion(
  targetType: ReferenceTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case 'motion_excerpt': {
      const [row] = await db
        .select({ id: motions.id })
        .from(motions)
        .where(eq(motions.id, targetId))
        .limit(1)
      return row?.id ?? null
    }
    case 'post': {
      const [row] = await db
        .select({ motionId: posts.motionId })
        .from(posts)
        .where(eq(posts.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'argument': {
      const [row] = await db
        .select({ motionId: motionArguments.motionId })
        .from(motionArguments)
        .where(eq(motionArguments.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'question': {
      const [row] = await db
        .select({ motionId: questions.motionId })
        .from(questions)
        .where(eq(questions.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'answer': {
      const [row] = await db
        .select({ motionId: answers.motionId })
        .from(answers)
        .where(eq(answers.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
    case 'resource': {
      const [row] = await db
        .select({ motionId: resources.motionId })
        .from(resources)
        .where(eq(resources.id, targetId))
        .limit(1)
      return row?.motionId ?? null
    }
  }
}

/**
 * Validate and persist inline references for a freshly-created source element.
 * Every target must belong to the same motion; a 'motion_excerpt' must carry the
 * marked text and point at the motion itself. Invalid references are rejected.
 */
export async function persistReferences(input: {
  motionId: string
  sourceType: ReferenceSourceType
  sourceId: string
  references: ReferenceInput[]
}): Promise<void> {
  if (input.references.length === 0) return

  const values: (typeof elementReferences.$inferInsert)[] = []
  for (const ref of input.references) {
    if (ref.targetType === 'motion_excerpt') {
      if (ref.targetId !== input.motionId || !ref.excerptText?.trim()) {
        throw createError({
          statusCode: 422,
          statusMessage: 'Ungültiger Antragstext-Bezug.',
        })
      }
    } else {
      const motionId = await resolveTargetMotion(ref.targetType, ref.targetId)
      if (motionId !== input.motionId) {
        throw createError({
          statusCode: 422,
          statusMessage: 'Referenziertes Element gehört nicht zu diesem Antrag.',
        })
      }
    }
    values.push({
      motionId: input.motionId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: ref.targetType,
      targetId: ref.targetId,
      excerptText:
        ref.targetType === 'motion_excerpt' || ref.targetType === 'post'
          ? (ref.excerptText ?? null)
          : null,
      excerptVersion:
        ref.targetType === 'motion_excerpt' ? (ref.excerptVersion ?? null) : null,
    })
  }

  await db.insert(elementReferences).values(values)
}

/**
 * Load outgoing references for a set of source elements and resolve each target
 * into a short, human-readable preview for rendering as an inline text block.
 */
export async function getReferencePreviewsForSources(
  sourceType: ReferenceSourceType,
  sourceIds: string[],
): Promise<Map<string, ReferencePreview[]>> {
  const result = new Map<string, ReferencePreview[]>()
  if (sourceIds.length === 0) return result

  const refs = await db
    .select()
    .from(elementReferences)
    .where(
      and(
        eq(elementReferences.sourceType, sourceType),
        inArray(elementReferences.sourceId, sourceIds),
      ),
    )
    .orderBy(elementReferences.createdAt)
  if (refs.length === 0) return result

  // Collect target ids per type for batch label lookups.
  const idsByType: Record<ReferenceTargetType, Set<string>> = {
    argument: new Set(),
    question: new Set(),
    answer: new Set(),
    resource: new Set(),
    post: new Set(),
    motion_excerpt: new Set(),
  }
  for (const ref of refs) {
    idsByType[ref.targetType].add(ref.targetId)
  }

  const labels: Record<ReferenceTargetType, Map<string, string>> = {
    argument: new Map(),
    question: new Map(),
    answer: new Map(),
    resource: new Map(),
    post: new Map(),
    motion_excerpt: new Map(),
  }

  const postAuthors = new Map<string, string | null>()

  if (idsByType.argument.size > 0) {
    const rows = await db
      .select({ id: motionArguments.id, title: motionArguments.title })
      .from(motionArguments)
      .where(inArray(motionArguments.id, [...idsByType.argument]))
    for (const row of rows) labels.argument.set(row.id, row.title)
  }
  if (idsByType.question.size > 0) {
    const rows = await db
      .select({ id: questions.id, title: questions.title })
      .from(questions)
      .where(inArray(questions.id, [...idsByType.question]))
    for (const row of rows) labels.question.set(row.id, row.title)
  }
  if (idsByType.resource.size > 0) {
    const rows = await db
      .select({ id: resources.id, title: resources.title })
      .from(resources)
      .where(inArray(resources.id, [...idsByType.resource]))
    for (const row of rows) labels.resource.set(row.id, row.title)
  }
  if (idsByType.answer.size > 0) {
    const rows = await db
      .select({ id: answers.id, bodyHtml: answers.bodyHtml })
      .from(answers)
      .where(inArray(answers.id, [...idsByType.answer]))
    for (const row of rows) labels.answer.set(row.id, snippet(row.bodyHtml))
  }
  if (idsByType.post.size > 0) {
    const rows = await db
      .select({
        id: posts.id,
        bodyHtml: posts.bodyHtml,
        deletedAt: posts.deletedAt,
        authorName: users.displayName,
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.authorId))
      .where(inArray(posts.id, [...idsByType.post]))
    for (const row of rows) {
      postAuthors.set(row.id, row.authorName)
      labels.post.set(row.id, row.deletedAt ? '(entfernter Beitrag)' : snippet(row.bodyHtml))
    }
  }

  for (const ref of refs) {
    let label: string
    let available = true
    const excerpt =
      ref.targetType === 'post' || ref.targetType === 'motion_excerpt'
        ? ref.excerptText?.trim()
        : undefined
    if (ref.targetType === 'motion_excerpt') {
      label = excerpt || 'Antragstext'
    } else if (excerpt && ref.targetType === 'post') {
      label = excerpt
    } else {
      const resolved = labels[ref.targetType].get(ref.targetId)
      if (resolved === undefined) {
        label = '(entfernt)'
        available = false
      } else {
        label = resolved
      }
    }
    const preview: ReferencePreview = {
      id: ref.id,
      targetType: ref.targetType,
      targetId: ref.targetId,
      label,
      excerptText: excerpt,
      quoteAuthorName:
        ref.targetType === 'post' && excerpt
          ? (postAuthors.get(ref.targetId) ?? null)
          : undefined,
      available,
    }
    const list = result.get(ref.sourceId) ?? []
    list.push(preview)
    result.set(ref.sourceId, list)
  }

  return result
}
