import { describe, it, expect } from 'vitest'
import {
  chatDayKey,
  formatChatTime,
  formatChatDateLabel,
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

describe('htmlPreview', () => {
  it('strips tags and truncates long text', () => {
    const preview = htmlPreview('<p>Hello <strong>world</strong>!</p>', 8)
    expect(preview).toBe('Hello w…')
  })
})
