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

const MS_MINUTE = 60_000
const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000
const RELATIVE_MAX_DAYS = 7

const WEEKDAY_WITH_TIME = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Recent timestamps (< 7 days) as relative German labels; older ones as absolute
 * date + time (DD.MM.YYYY, HH:MM).
 */
export function formatRecentTimestamp(
  value: string | Date,
  now = new Date(),
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) {
    return formatAbsoluteTimestamp(date)
  }

  const today = startOfLocalDay(now)
  const target = startOfLocalDay(date)
  const calendarDays = Math.round((today.getTime() - target.getTime()) / MS_DAY)

  if (calendarDays >= RELATIVE_MAX_DAYS) {
    return formatAbsoluteTimestamp(date)
  }

  if (calendarDays === 0) {
    if (diffMs < MS_MINUTE) return 'gerade eben'
    if (diffMs < MS_HOUR) {
      const minutes = Math.max(1, Math.floor(diffMs / MS_MINUTE))
      return `vor ${minutes} Min.`
    }
    const hours = Math.max(1, Math.floor(diffMs / MS_HOUR))
    return `vor ${hours} Std.`
  }

  if (calendarDays === 1) {
    return `gestern, ${formatChatTime(date)}`
  }

  const weekday = WEEKDAY_WITH_TIME.format(date)
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

function formatAbsoluteTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

/** Date only (DD.MM.YYYY) for suggestion popovers and similar UI. */
export function formatDateOnly(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Suggestion hover timestamps: relative labels within 7 days, otherwise date only.
 */
export function formatSuggestionTimestamp(
  value: string | Date,
  now = new Date(),
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) {
    return formatDateOnly(date)
  }

  const today = startOfLocalDay(now)
  const target = startOfLocalDay(date)
  const calendarDays = Math.round((today.getTime() - target.getTime()) / MS_DAY)

  if (calendarDays >= RELATIVE_MAX_DAYS) {
    return formatDateOnly(date)
  }

  return formatRecentTimestamp(date, now)
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
