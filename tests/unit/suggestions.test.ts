import { describe, it, expect } from 'vitest'
import {
  validateWorkingDoc,
  countOpenSuggestions,
  extractSuggestions,
  extractMediaRefsFromHtml,
  extractMediaRefsFromDoc,
  mediaRefsEqual,
} from '../../server/utils/suggestions'

const workingDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bestand ' },
        {
          type: 'text',
          text: 'neuer Text',
          marks: [{
            type: 'insertion',
            attrs: {
              id: 1,
              userId: 'u1',
              userName: 'Alice',
              createdAt: '2026-06-10T14:30:00.000Z',
            },
          }],
        },
        {
          type: 'text',
          text: 'alter Text',
          marks: [{ type: 'deletion', attrs: { id: 2, userId: 'u2', userName: 'Bob' } }],
        },
      ],
    },
  ],
}

describe('validateWorkingDoc', () => {
  it('accepts a doc with allowed nodes and suggestion marks', () => {
    expect(validateWorkingDoc(workingDoc).ok).toBe(true)
  })

  it('rejects a non-doc root', () => {
    expect(validateWorkingDoc({ type: 'paragraph' }).ok).toBe(false)
    expect(validateWorkingDoc(null).ok).toBe(false)
  })

  it('rejects unknown node types', () => {
    const bad = { type: 'doc', content: [{ type: 'script' }] }
    expect(validateWorkingDoc(bad).ok).toBe(false)
  })

  it('rejects unknown mark types', () => {
    const bad = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'evil' }] }],
        },
      ],
    }
    expect(validateWorkingDoc(bad).ok).toBe(false)
  })
})

describe('countOpenSuggestions', () => {
  it('counts distinct suggestion ids', () => {
    expect(countOpenSuggestions(workingDoc)).toBe(2)
  })

  it('returns 0 for a doc without suggestions', () => {
    const clean = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(countOpenSuggestions(clean)).toBe(0)
  })
})

describe('extractSuggestions', () => {
  it('derives type, author and snippet per suggestion', () => {
    const items = extractSuggestions(workingDoc)
    expect(items).toHaveLength(2)

    const insertion = items.find((i) => i.id === 1)
    expect(insertion?.type).toBe('insertion')
    expect(insertion?.authorName).toBe('Alice')
    expect(insertion?.createdAt).toBe('2026-06-10T14:30:00.000Z')
    expect(insertion?.snippet).toBe('neuer Text')

    const deletion = items.find((i) => i.id === 2)
    expect(deletion?.type).toBe('deletion')
    expect(deletion?.authorId).toBe('u2')
    expect(deletion?.createdAt).toBeNull()
  })

  it('includes optional rationale from mark attrs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Vorschlag',
              marks: [{
                type: 'insertion',
                attrs: {
                  id: 3,
                  userId: 'u1',
                  userName: 'Alice',
                  createdAt: '2026-06-10T14:30:00.000Z',
                  rationale: 'Bessere Formulierung nötig.',
                },
              }],
            },
          ],
        },
      ],
    }
    const item = extractSuggestions(doc).find((entry) => entry.id === 3)
    expect(item?.rationale).toBe('Bessere Formulierung nötig.')
  })
})

describe('media reference checks', () => {
  it('extracts upload refs from HTML', () => {
    const html =
      '<p>Text</p><img src="/uploads/a.png" alt=""><a data-attachment href="/uploads/b.pdf">Anhang</a>'
    expect(extractMediaRefsFromHtml(html)).toEqual(['/uploads/a.png', '/uploads/b.pdf'])
  })

  it('extracts upload refs from a ProseMirror doc', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/uploads/a.png' } },
        { type: 'attachment', attrs: { href: '/uploads/b.pdf' } },
      ],
    }
    expect(extractMediaRefsFromDoc(doc)).toEqual(['/uploads/a.png', '/uploads/b.pdf'])
  })

  it('compares media reference lists', () => {
    expect(mediaRefsEqual(['/uploads/a.png'], ['/uploads/a.png'])).toBe(true)
    expect(mediaRefsEqual(['/uploads/a.png'], ['/uploads/b.pdf'])).toBe(false)
    expect(mediaRefsEqual([], ['/uploads/a.png'])).toBe(false)
  })
})
