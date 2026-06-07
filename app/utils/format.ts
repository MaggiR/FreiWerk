import {
  TOPIC_LABELS,
  MOTION_STATUS_LABELS,
  type Topic,
} from '../../shared/constants'

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic as Topic] ?? topic
}

export function statusLabel(status: string): string {
  return MOTION_STATUS_LABELS[status] ?? status
}

export function statusIcon(status: string): string | null {
  const icons: Record<string, string> = {
    draft: 'pen',
    debate: 'comments',
    ballot: 'chart-column',
  }
  return icons[status] ?? null
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Human-friendly remaining time until a deadline, in German.
 */
export function timeRemaining(value: string | Date | null | undefined): string {
  if (!value) return ''
  const end = typeof value === 'string' ? new Date(value) : value
  const ms = end.getTime() - Date.now()
  if (ms <= 0) return 'beendet'
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `noch ${days} Tag${days === 1 ? '' : 'e'}`
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 1) return `noch ${hours} Std.`
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)))
  return `noch ${minutes} Min.`
}

export function approvalRatio(approve: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((approve / total) * 100)
}
