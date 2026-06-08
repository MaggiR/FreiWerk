import { describe, it, expect } from 'vitest'
import {
  approvalRatio,
  topicLabel,
  statusLabel,
  statusIcon,
  truncateText,
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

describe('truncateText', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('Kurz', 100)).toBe('Kurz')
  })

  it('truncates at the character limit with an ellipsis', () => {
    const text = 'a'.repeat(120)
    expect(truncateText(text, 100)).toBe(`${'a'.repeat(100)}…`)
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
    expect(statusIcon('ballot')).toBe('chart-column')
    expect(statusIcon('decided')).toBeNull()
  })
})
