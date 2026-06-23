export interface MotionDraftFields {
  title?: string
  summary?: string
  bodyHtml?: string
  topic?: string
  divisionId?: string | null
}

/** True when the draft has no user-entered content worth preserving. */
export function isMotionDraftEmpty(fields: MotionDraftFields): boolean {
  if (fields.title?.trim()) return false
  if (fields.summary?.trim()) return false
  if (fields.divisionId != null) return false

  const bodyText = (fields.bodyHtml ?? '').replace(/<[^>]*>/g, '').trim()
  if (bodyText) return false

  const topic = fields.topic?.trim() ?? ''
  if (topic && topic !== 'sonstiges') return false

  return true
}
