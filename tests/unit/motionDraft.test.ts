import { describe, it, expect } from 'vitest'
import { isMotionDraftEmpty } from '../../app/utils/motionDraft'

describe('isMotionDraftEmpty', () => {
  it('returns true for an empty draft', () => {
    expect(isMotionDraftEmpty({})).toBe(true)
    expect(
      isMotionDraftEmpty({
        title: '',
        summary: '',
        bodyHtml: '<p></p>',
        topic: '',
      }),
    ).toBe(true)
  })

  it('returns false when title is set', () => {
    expect(isMotionDraftEmpty({ title: 'Mein Antrag' })).toBe(false)
  })

  it('returns false when body text is set', () => {
    expect(isMotionDraftEmpty({ bodyHtml: '<p>Inhalt</p>' })).toBe(false)
  })

  it('returns false when a topic other than the placeholder is set', () => {
    expect(isMotionDraftEmpty({ topic: 'wirtschaft' })).toBe(false)
  })

  it('treats auto-assigned sonstiges without content as empty', () => {
    expect(isMotionDraftEmpty({ topic: 'sonstiges' })).toBe(true)
  })
})
