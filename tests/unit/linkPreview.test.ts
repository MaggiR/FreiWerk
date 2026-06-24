import { describe, it, expect } from 'vitest'
import { extractFirstLinkUrl, normalizeLinkUrl, bodyContainsUrl } from '../../shared/linkPreview'
import {
  buildLinkPreviewHtml,
  parseLinkPreviewFromHtml,
} from '../../server/utils/linkPreview'
import { sanitizeRichText } from '../../server/utils/sanitize'

describe('normalizeLinkUrl', () => {
  it('accepts http and https URLs', () => {
    expect(normalizeLinkUrl('https://example.org/path')).toBe('https://example.org/path')
  })

  it('strips trailing punctuation', () => {
    expect(normalizeLinkUrl('https://example.org/path.')).toBe('https://example.org/path')
  })

  it('rejects non-http schemes', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('extractFirstLinkUrl', () => {
  it('finds the first URL in rich text', () => {
    const html = '<p>Siehe https://example.org/foo und https://other.test/bar</p>'
    expect(extractFirstLinkUrl(html)).toBe('https://example.org/foo')
  })

  it('ignores upload paths', () => {
    const html = '<p>https://example.org/x</p><img src="/uploads/abc.png">'
    expect(extractFirstLinkUrl(html)).toBe('https://example.org/x')
  })
})

describe('bodyContainsUrl', () => {
  it('detects URLs in body text', () => {
    expect(bodyContainsUrl('<p>Link: https://example.org</p>', 'https://example.org/')).toBe(true)
  })
})

describe('parseLinkPreviewFromHtml', () => {
  it('reads Open Graph metadata', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Beispiel Titel">
        <meta property="og:description" content="Kurzbeschreibung">
        <meta property="og:image" content="/cover.jpg">
        <meta property="og:site_name" content="Example">
      </head></html>
    `
    const preview = parseLinkPreviewFromHtml(new URL('https://example.org/article'), html)
    expect(preview.title).toBe('Beispiel Titel')
    expect(preview.description).toBe('Kurzbeschreibung')
    expect(preview.imageUrl).toBe('https://example.org/cover.jpg')
    expect(preview.siteName).toBe('Example')
  })
})

describe('buildLinkPreviewHtml', () => {
  it('escapes HTML in preview fields', () => {
    const html = buildLinkPreviewHtml({
      url: 'https://example.org',
      title: '<script>alert(1)</script>',
      description: 'Desc & more',
      imageUrl: 'https://example.org/img.jpg',
      siteName: 'Example',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&amp; more')
    expect(html).toContain('class="link-preview"')
  })
})

describe('sanitizeRichText link previews', () => {
  it('keeps link preview markup', () => {
    const dirty = buildLinkPreviewHtml({
      url: 'https://example.org',
      title: 'Titel',
      description: 'Text',
      imageUrl: 'https://example.org/img.jpg',
      siteName: 'Example',
    })
    const clean = sanitizeRichText(dirty)
    expect(clean).toContain('class="link-preview"')
    expect(clean).toContain('class="link-preview__title"')
    expect(clean).toContain('src="https://example.org/img.jpg"')
  })
})
