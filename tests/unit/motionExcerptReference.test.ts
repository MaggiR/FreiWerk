import { describe, expect, it } from 'vitest'
import {
  buildMotionExcerptReference,
  isExpandableExcerptReference,
  referenceExcerptText,
  referenceLabelSnippet,
} from '../../app/utils/references'

describe('referenceLabelSnippet', () => {
  it('normalizes whitespace', () => {
    expect(referenceLabelSnippet('  foo   bar  ')).toBe('foo bar')
  })

  it('truncates long labels with ellipsis', () => {
    const long = 'a'.repeat(100)
    const snippet = referenceLabelSnippet(long)
    expect(snippet.length).toBeLessThanOrEqual(90)
    expect(snippet.endsWith('…')).toBe(true)
  })
})

describe('buildMotionExcerptReference', () => {
  const motionId = '11111111-1111-4111-8111-111111111111'

  it('builds a motion_excerpt draft with version', () => {
    const ref = buildMotionExcerptReference(motionId, '  Wichtiger   Absatz  ', 3)
    expect(ref).toEqual({
      targetType: 'motion_excerpt',
      targetId: motionId,
      label: 'Wichtiger Absatz',
      excerptText: 'Wichtiger Absatz',
      excerptVersion: 3,
    })
  })

  it('omits excerptVersion when not provided', () => {
    const ref = buildMotionExcerptReference(motionId, 'Kurz')
    expect(ref.excerptVersion).toBeUndefined()
  })
})

describe('referenceExcerptText', () => {
  const motionId = '11111111-1111-4111-8111-111111111111'

  it('prefers excerptText for motion_excerpt and post quotes', () => {
    expect(
      referenceExcerptText({
        targetType: 'motion_excerpt',
        targetId: motionId,
        label: 'Kurz…',
        excerptText: 'Voller Antragstext',
      }),
    ).toBe('Voller Antragstext')
    expect(
      referenceExcerptText({
        targetType: 'post',
        targetId: motionId,
        label: 'Fallback',
        excerptText: 'Zitat',
      }),
    ).toBe('Zitat')
  })
})

describe('isExpandableExcerptReference', () => {
  it('matches motion excerpts and post quotes only', () => {
    expect(isExpandableExcerptReference({ targetType: 'motion_excerpt' })).toBe(true)
    expect(
      isExpandableExcerptReference({ targetType: 'post', excerptText: 'Zitat' }),
    ).toBe(true)
    expect(isExpandableExcerptReference({ targetType: 'post' })).toBe(false)
    expect(isExpandableExcerptReference({ targetType: 'argument' })).toBe(false)
  })
})
