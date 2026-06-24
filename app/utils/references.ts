export type ReferenceTargetType =
  | 'argument'
  | 'question'
  | 'answer'
  | 'resource'
  | 'post'
  | 'motion_excerpt'

/** A reference selected in the composer, not yet persisted. */
export interface ReferenceDraft {
  targetType: ReferenceTargetType
  targetId: string
  label: string
  excerptText?: string
  excerptVersion?: number
}

/** A referenceable element offered by the picker. */
export interface ReferenceableItem {
  targetType: ReferenceTargetType
  targetId: string
  label: string
}

export const REFERENCE_ICONS: Record<ReferenceTargetType, string> = {
  argument: 'scale-balanced',
  question: 'circle-question',
  answer: 'comment-dots',
  resource: 'paperclip',
  post: 'comment',
  motion_excerpt: 'quote-left',
}

const REFERENCE_LABEL_MAX = 90

/** Short label for composer chips and message reference lines. */
export function referenceLabelSnippet(text: string, max = REFERENCE_LABEL_MAX): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trimEnd()}…`
}

/** Build a motion_excerpt reference from a marked passage in the motion body. */
export function buildMotionExcerptReference(
  motionId: string,
  excerptText: string,
  motionVersion?: number | null,
): ReferenceDraft {
  const excerpt = excerptText.replace(/\s+/g, ' ').trim()
  const ref: ReferenceDraft = {
    targetType: 'motion_excerpt',
    targetId: motionId,
    label: referenceLabelSnippet(excerpt),
    excerptText: excerpt,
  }
  if (motionVersion != null) {
    ref.excerptVersion = motionVersion
  }
  return ref
}

/** Full passage text for expandable excerpt references. */
export function referenceExcerptText(ref: {
  targetType: ReferenceTargetType
  excerptText?: string
  label: string
}): string {
  if (ref.targetType === 'motion_excerpt' || ref.targetType === 'post') {
    return (ref.excerptText ?? ref.label).trim()
  }
  return ref.label.trim()
}

export function isExpandableExcerptReference(ref: {
  targetType: ReferenceTargetType
  excerptText?: string
}): boolean {
  if (ref.targetType === 'motion_excerpt') return true
  return ref.targetType === 'post' && Boolean(ref.excerptText?.trim())
}
