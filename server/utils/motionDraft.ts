import { TOPICS, type Topic } from '../../shared/constants'
import { sanitizeRichText } from './sanitize'

const DEFAULT_DRAFT_TOPIC: Topic = 'sonstiges'

export function isValidTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value)
}

/** Allows empty draft bodies; stores a minimal TipTap placeholder. */
export function normalizeDraftBodyHtml(html: string): string {
  const clean = sanitizeRichText(html)
  if (clean.replace(/<[^>]*>/g, '').trim().length === 0) {
    return '<p></p>'
  }
  return clean
}

export function resolveDraftTopic(topic: string | undefined, fallback?: string): Topic {
  if (topic && isValidTopic(topic)) return topic
  if (fallback && isValidTopic(fallback)) return fallback
  return DEFAULT_DRAFT_TOPIC
}
