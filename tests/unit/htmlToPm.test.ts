import { describe, it, expect } from 'vitest'
import {
  applySuggestionsToDoc,
  htmlToProseMirrorDoc,
} from '../../server/utils/htmlToPm'
import { validateWorkingDoc } from '../../server/utils/suggestions'

describe('htmlToProseMirrorDoc', () => {
  it('converts hyperlinks into link marks', () => {
    const html =
      '<p>Mehr unter <a href="https://example.org/" target="_blank" rel="noopener noreferrer">Beispiel</a>.</p>'
    const doc = htmlToProseMirrorDoc(html)
    const paragraph = doc.content?.[0]
    expect(paragraph?.type).toBe('paragraph')
    const linked = paragraph?.content?.find((node) =>
      node.marks?.some((mark) => mark.type === 'link'),
    )
    expect(linked?.text).toBe('Beispiel')
    expect(linked?.marks?.find((mark) => mark.type === 'link')?.attrs?.href).toBe(
      'https://example.org/',
    )
    expect(validateWorkingDoc(doc).ok).toBe(true)
  })

  it('converts motion-style HTML and applies suggestion marks in place', () => {
    const html =
      '<h2>Forderungen</h2><p>Wir fordern eine verbindliche Open-Source-Strategie.</p>'
    const doc = htmlToProseMirrorDoc(html)
    const withMarks = applySuggestionsToDoc(doc, [
      {
        id: 1,
        type: 'deletion',
        text: 'verbindliche ',
        userId: 'user-1',
        userName: 'Test User',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    ])

    expect(validateWorkingDoc(withMarks).ok).toBe(true)
    expect(JSON.stringify(withMarks)).toContain('verbindliche ')
    expect(JSON.stringify(withMarks)).toContain('"type":"deletion"')
  })
})
