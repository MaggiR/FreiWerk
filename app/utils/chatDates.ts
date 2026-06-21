/** Calendar day key (local timezone) for grouping chat messages. */
export function chatDayKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** HH:MM for a single message timestamp. */
export function formatChatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const WEEKDAY = new Intl.DateTimeFormat('de-DE', { weekday: 'long' })
const FULL_DATE = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Human-friendly date label for chat separators. Recent days show the weekday;
 * older messages show the full calendar date.
 */
export function formatChatDateLabel(value: string | Date, now = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const today = startOfLocalDay(now)
  const target = startOfLocalDay(date)
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  if (diffDays > 1 && diffDays < 7) {
    const weekday = WEEKDAY.format(date)
    return weekday.charAt(0).toUpperCase() + weekday.slice(1)
  }
  return FULL_DATE.format(date)
}

/** Strip HTML to a short plain-text preview (for reply quotes). */
export function htmlPreview(html: string, maxLength = 80): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}
