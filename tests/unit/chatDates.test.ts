import { describe, it, expect } from 'vitest'
import {
  chatDayKey,
  formatChatTime,
  formatChatDateLabel,
  formatRecentTimestamp,
  formatSuggestionTimestamp,
  htmlPreview,
} from '../../app/utils/chatDates'

describe('chatDayKey', () => {
  it('returns YYYY-MM-DD in local timezone', () => {
    const key = chatDayKey(new Date(2026, 5, 19, 23, 30))
    expect(key).toBe('2026-06-19')
  })
})

describe('formatChatTime', () => {
  it('formats hours and minutes', () => {
    const label = formatChatTime(new Date(2026, 5, 19, 14, 5))
    expect(label).toMatch(/14:05/)
  })
})

describe('formatChatDateLabel', () => {
  const now = new Date(2026, 5, 19, 12, 0)

  it('shows Heute for today', () => {
    expect(formatChatDateLabel(new Date(2026, 5, 19, 8, 0), now)).toBe('Heute')
  })

  it('shows Gestern for yesterday', () => {
    expect(formatChatDateLabel(new Date(2026, 5, 18, 8, 0), now)).toBe('Gestern')
  })

  it('shows weekday for recent days within a week', () => {
    const label = formatChatDateLabel(new Date(2026, 5, 16, 8, 0), now)
    expect(label).toBe('Dienstag')
  })

  it('shows full date for older messages', () => {
    const label = formatChatDateLabel(new Date(2026, 4, 1, 8, 0), now)
    expect(label).toContain('2026')
    expect(label).toContain('Mai')
  })
})

describe('formatRecentTimestamp', () => {
  const now = new Date(2026, 5, 19, 15, 0)

  it('shows gerade eben for very recent entries', () => {
    expect(formatRecentTimestamp(new Date(2026, 5, 19, 14, 59, 30), now)).toBe('gerade eben')
  })

  it('shows minutes and hours for today', () => {
    expect(formatRecentTimestamp(new Date(2026, 5, 19, 14, 30), now)).toBe('vor 30 Min.')
    expect(formatRecentTimestamp(new Date(2026, 5, 19, 12, 0), now)).toBe('vor 3 Std.')
  })

  it('shows gestern with time for yesterday', () => {
    expect(formatRecentTimestamp(new Date(2026, 5, 18, 9, 15), now)).toBe('gestern, 09:15')
  })

  it('shows weekday with time within the last week', () => {
    const label = formatRecentTimestamp(new Date(2026, 5, 16, 11, 45), now)
    expect(label).toMatch(/^Dienstag, 11:45$/)
  })

  it('shows absolute date for entries older than seven days', () => {
    const label = formatRecentTimestamp(new Date(2026, 5, 10, 8, 0), now)
    expect(label).toMatch(/10\.06\.2026/)
    expect(label).toMatch(/08:00/)
  })
})

describe('formatSuggestionTimestamp', () => {
  const now = new Date(2026, 5, 19, 15, 0)

  it('shows relative labels within seven days', () => {
    expect(formatSuggestionTimestamp(new Date(2026, 5, 19, 14, 30), now)).toBe('vor 30 Min.')
  })

  it('shows date only for entries older than seven days', () => {
    expect(formatSuggestionTimestamp(new Date(2026, 5, 10, 8, 0), now)).toBe('10.06.2026')
  })
})

describe('htmlPreview', () => {
  it('strips tags and truncates long text', () => {
    const preview = htmlPreview('<p>Hello <strong>world</strong>!</p>', 8)
    expect(preview).toBe('Hello w…')
  })
})
