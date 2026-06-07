import { describe, it, expect } from 'vitest'
import { sanitizeRichText, htmlToText } from '../../server/utils/sanitize'

describe('sanitizeRichText', () => {
  it('removes script tags and event handlers', () => {
    const dirty = '<p>Hallo</p><script>alert(1)</script>'
    const clean = sanitizeRichText(dirty)
    expect(clean).toContain('<p>Hallo</p>')
    expect(clean).not.toContain('<script>')
    expect(clean).not.toContain('alert(1)')
  })

  it('strips disallowed attributes but keeps formatting', () => {
    const dirty = '<p onclick="evil()"><strong>Fett</strong> und <em>kursiv</em></p>'
    const clean = sanitizeRichText(dirty)
    expect(clean).toContain('<strong>Fett</strong>')
    expect(clean).toContain('<em>kursiv</em>')
    expect(clean).not.toContain('onclick')
  })

  it('forces safe rel/target on links', () => {
    const clean = sanitizeRichText('<a href="https://example.org">Link</a>')
    expect(clean).toContain('rel="noopener noreferrer nofollow"')
    expect(clean).toContain('target="_blank"')
  })

  it('drops javascript: URLs', () => {
    const clean = sanitizeRichText('<a href="javascript:alert(1)">x</a>')
    expect(clean).not.toContain('javascript:')
  })
})

describe('htmlToText', () => {
  it('produces a plain-text excerpt', () => {
    expect(htmlToText('<p>Hallo <strong>Welt</strong></p>')).toBe('Hallo Welt')
  })

  it('truncates long text with an ellipsis', () => {
    const long = `<p>${'a'.repeat(400)}</p>`
    const text = htmlToText(long, 50)
    expect(text.length).toBe(50)
    expect(text.endsWith('\u2026')).toBe(true)
  })
})
