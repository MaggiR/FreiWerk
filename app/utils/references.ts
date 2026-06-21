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
