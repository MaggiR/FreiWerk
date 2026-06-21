import { describe, it, expect } from 'vitest'
import {
  approvalRatio,
  formatAddedAt,
  formatAuthorAffiliation,
  formatCompactCount,
  topicLabel,
  statusLabel,
  statusIcon,
  truncateText,
  highlightParts,
} from '../../app/utils/format'

describe('approvalRatio', () => {
  it('computes a rounded percentage', () => {
    expect(approvalRatio(1, 2)).toBe(50)
    expect(approvalRatio(1, 3)).toBe(33)
    expect(approvalRatio(2, 3)).toBe(67)
  })

  it('returns 0 when there are no votes', () => {
    expect(approvalRatio(0, 0)).toBe(0)
  })
})

describe('formatCompactCount', () => {
  it('keeps values below 1_000 unchanged', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(42)).toBe('42')
    expect(formatCompactCount(999)).toBe('999')
  })

  it('formats thousands and millions with one decimal in German', () => {
    expect(formatCompactCount(1000)).toBe('1,0 K')
    expect(formatCompactCount(1500)).toBe('1,5 K')
    expect(formatCompactCount(1_000_000)).toBe('1,0 M')
    expect(formatCompactCount(1_234_567)).toBe('1,2 M')
  })
})

describe('truncateText', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('Kurz', 100)).toBe('Kurz')
  })

  it('truncates at the character limit with an ellipsis', () => {
    const text = 'a'.repeat(120)
    expect(truncateText(text, 100)).toBe(`${'a'.repeat(100)}…`)
  })
})

describe('highlightParts', () => {
  it('returns the full text when the query is empty', () => {
    expect(highlightParts('Energiewende beschleunigen', '')).toEqual([
      { text: 'Energiewende beschleunigen', highlight: false },
    ])
  })

  it('highlights a case-insensitive match and preserves casing', () => {
    expect(highlightParts('Energiewende beschleunigen', 'energie')).toEqual([
      { text: 'Energie', highlight: true },
      { text: 'wende beschleunigen', highlight: false },
    ])
  })

  it('highlights every occurrence', () => {
    expect(highlightParts('foo bar foo', 'foo')).toEqual([
      { text: 'foo', highlight: true },
      { text: ' bar ', highlight: false },
      { text: 'foo', highlight: true },
    ])
  })
})

describe('labels', () => {
  it('maps known topics and statuses to German labels', () => {
    expect(topicLabel('wirtschaft')).toBe('Wirtschaft')
    expect(statusLabel('debate')).toBe('Debatte')
  })

  it('falls back to the raw value for unknown keys', () => {
    expect(topicLabel('unknown')).toBe('unknown')
    expect(statusLabel('weird')).toBe('weird')
  })

  it('maps known statuses to icons', () => {
    expect(statusIcon('draft')).toBe('pen')
    expect(statusIcon('debate')).toBe('comments')
    expect(statusIcon('ballot')).toBe('check-to-slot')
    expect(statusIcon('decided')).toBe('circle-check')
    expect(statusIcon('weird')).toBeNull()
  })
})

describe('formatAddedAt', () => {
  const now = new Date(2026, 5, 22, 12, 0)

  it('uses relative labels within 7 days', () => {
    const recent = new Date(2026, 5, 22, 11, 30)
    expect(formatAddedAt(recent, now)).toBe('Hinzugefügt vor 30 Min.')
  })

  it('uses absolute date for entries 7 days or older', () => {
    const older = new Date(2026, 5, 10, 8, 0)
    expect(formatAddedAt(older, now)).toBe('Hinzugefügt am 10. Juni 2026')
  })
})

describe('formatAuthorAffiliation', () => {
  it('returns profile function when set', () => {
    expect(formatAuthorAffiliation('Mitglied LFA Digitales', 'member')).toBe(
      'Mitglied LFA Digitales',
    )
  })

  it('falls back to platform role for moderators without fn', () => {
    expect(formatAuthorAffiliation(null, 'moderator')).toBe('Moderator:in')
  })

  it('avoids duplicating role label when fn already contains it', () => {
    expect(formatAuthorAffiliation('Administrator:in', 'admin')).toBe('Administrator:in')
  })

  it('returns null for members without fn', () => {
    expect(formatAuthorAffiliation(null, 'member')).toBeNull()
  })
})
