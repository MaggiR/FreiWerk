import { describe, it, expect } from 'vitest'
import {
  applySuggestionsToDoc,
  htmlToProseMirrorDoc,
} from '../../server/utils/htmlToPm'
import { validateWorkingDoc } from '../../server/utils/suggestions'

describe('htmlToProseMirrorDoc', () => {
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
