import { describe, it, expect } from 'vitest'
import { POST_EDIT_WINDOW_MS } from '#shared/constants'
import {
  buildInboundReferenceCounts,
  isWithinPostEditWindow,
} from '../../server/utils/posts'

describe('buildInboundReferenceCounts', () => {
  it('counts direct replies and explicit post references', () => {
    const rows = [
      { id: 'root', parentId: null, deletedAt: null },
      { id: 'reply', parentId: 'root', deletedAt: null },
    ]
    const referencesByPost = new Map([
      [
        'explicit',
        [
          {
            id: 'ref-1',
            targetType: 'post' as const,
            targetId: 'root',
            label: 'Root',
            available: true,
          },
        ],
      ],
    ])
    rows.push({ id: 'explicit', parentId: null, deletedAt: null })

    const counts = buildInboundReferenceCounts(rows, referencesByPost)
    expect(counts.get('root')).toBe(2)
  })

  it('dedupes when a reply also explicitly references its parent', () => {
    const rows = [
      { id: 'root', parentId: null, deletedAt: null },
      { id: 'both', parentId: 'root', deletedAt: null },
    ]
    const referencesByPost = new Map([
      [
        'both',
        [
          {
            id: 'ref-1',
            targetType: 'post' as const,
            targetId: 'root',
            label: 'Root',
            available: true,
          },
        ],
      ],
    ])

    expect(buildInboundReferenceCounts(rows, referencesByPost).get('root')).toBe(1)
  })
})

describe('isWithinPostEditWindow', () => {
  it('allows edits within two hours of creation', () => {
    const createdAt = new Date('2026-06-24T10:00:00.000Z')
    const now = createdAt.getTime() + POST_EDIT_WINDOW_MS - 1
    expect(isWithinPostEditWindow(createdAt, now)).toBe(true)
  })

  it('rejects edits after two hours', () => {
    const createdAt = new Date('2026-06-24T10:00:00.000Z')
    const now = createdAt.getTime() + POST_EDIT_WINDOW_MS + 1
    expect(isWithinPostEditWindow(createdAt, now)).toBe(false)
  })
})
