import { describe, it, expect } from 'vitest'
import {
  buildInboundByPost,
  buildThreadTree,
  buildChatTimeline,
  countVisiblePosts,
  findLatestEditableOwnPost,
  inboundRefsFor,
  isOwnPostEditable,
  isPostEdited,
  postsForThreadFilter,
  type DebatePost,
} from '../../app/utils/debate'
import { POST_EDIT_WINDOW_MS } from '#shared/constants'

function post(partial: Partial<DebatePost> & { id: string }): DebatePost {
  return {
    id: partial.id,
    parentId: partial.parentId ?? null,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? null,
    deleted: partial.deleted ?? false,
    bodyHtml: partial.bodyHtml ?? '<p>Text</p>',
    authorId: partial.authorId ?? 'u1',
    authorName: partial.authorName ?? 'Demo',
    authorFn: partial.authorFn ?? null,
    authorRole: partial.authorRole ?? null,
    authorAvatarUrl: partial.authorAvatarUrl ?? null,
    upvoteCount: partial.upvoteCount ?? 0,
    upvotedByMe: partial.upvotedByMe ?? false,
    savedByMe: partial.savedByMe ?? false,
    references: partial.references ?? [],
    referencedByCount: partial.referencedByCount ?? 0,
  }
}

describe('buildThreadTree', () => {
  it('nests replies under their parent', () => {
    const posts = [
      post({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'b', parentId: 'a', createdAt: '2026-01-01T11:00:00.000Z' }),
      post({ id: 'c', parentId: 'b', createdAt: '2026-01-01T12:00:00.000Z' }),
    ]
    const tree = buildThreadTree(posts, 'oldest')
    expect(tree).toHaveLength(1)
    expect(tree[0]!.post.id).toBe('a')
    expect(tree[0]!.children[0]!.post.id).toBe('b')
    expect(tree[0]!.children[0]!.children[0]!.post.id).toBe('c')
  })

  it('orders top-level posts oldest first by default', () => {
    const posts = [
      post({ id: 'old', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'new', createdAt: '2026-01-02T10:00:00.000Z' }),
    ]
    const tree = buildThreadTree(posts)
    expect(tree.map((n) => n.post.id)).toEqual(['old', 'new'])
  })

  it('can order top-level posts newest first', () => {
    const posts = [
      post({ id: 'old', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'new', createdAt: '2026-01-02T10:00:00.000Z' }),
    ]
    const tree = buildThreadTree(posts, 'recent')
    expect(tree.map((n) => n.post.id)).toEqual(['new', 'old'])
  })

  it('keeps replies in chronological order regardless of top sort', () => {
    const posts = [
      post({ id: 'root', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'r1', parentId: 'root', createdAt: '2026-01-01T11:00:00.000Z' }),
      post({ id: 'r2', parentId: 'root', createdAt: '2026-01-01T12:00:00.000Z' }),
    ]
    const tree = buildThreadTree(posts, 'recent')
    expect(tree[0]!.children.map((n) => n.post.id)).toEqual(['r1', 'r2'])
  })

  it('treats posts with a missing parent as top-level', () => {
    const posts = [post({ id: 'orphan', parentId: 'ghost' })]
    const tree = buildThreadTree(posts)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.post.id).toBe('orphan')
  })
})

describe('countVisiblePosts', () => {
  it('excludes tombstoned (deleted) posts', () => {
    const posts = [
      post({ id: 'a' }),
      post({ id: 'b', deleted: true }),
      post({ id: 'c' }),
    ]
    expect(countVisiblePosts(posts)).toBe(2)
  })
})

describe('findLatestEditableOwnPost', () => {
  const now = new Date('2026-06-24T12:00:00.000Z').getTime()
  const userId = 'u1'

  it('returns the newest editable own post', () => {
    const posts = [
      post({
        id: 'old',
        authorId: userId,
        createdAt: '2026-06-24T10:00:00.000Z',
      }),
      post({
        id: 'new',
        authorId: userId,
        createdAt: '2026-06-24T11:30:00.000Z',
      }),
      post({
        id: 'other',
        authorId: 'u2',
        createdAt: '2026-06-24T11:45:00.000Z',
      }),
    ]
    expect(findLatestEditableOwnPost(posts, userId, true, now)?.id).toBe('new')
  })

  it('returns null when the edit window has expired', () => {
    const posts = [
      post({
        id: 'stale',
        authorId: userId,
        createdAt: '2026-06-24T08:00:00.000Z',
      }),
    ]
    expect(findLatestEditableOwnPost(posts, userId, true, now)).toBeNull()
  })

  it('ignores deleted posts', () => {
    const posts = [
      post({
        id: 'deleted',
        authorId: userId,
        deleted: true,
        createdAt: '2026-06-24T11:00:00.000Z',
      }),
    ]
    expect(findLatestEditableOwnPost(posts, userId, true, now)).toBeNull()
  })
})

describe('isOwnPostEditable', () => {
  it('matches the two-hour edit window', () => {
    const createdAt = '2026-06-24T10:00:00.000Z'
    const postItem = post({ id: 'a', authorId: 'u1', createdAt })
    const inside = new Date(createdAt).getTime() + POST_EDIT_WINDOW_MS - 1
    const outside = new Date(createdAt).getTime() + POST_EDIT_WINDOW_MS + 1
    expect(isOwnPostEditable(postItem, 'u1', true, inside)).toBe(true)
    expect(isOwnPostEditable(postItem, 'u1', true, outside)).toBe(false)
  })
})

describe('buildInboundByPost', () => {
  it('includes direct replies as inbound references', () => {
    const posts = [
      post({ id: 'root' }),
      post({ id: 'reply', parentId: 'root', bodyHtml: '<p>Antwort</p>' }),
    ]
    const inbound = buildInboundByPost(posts)
    expect(inboundRefsFor(inbound, 'root')).toEqual([
      expect.objectContaining({ id: 'reply', excerpt: expect.stringContaining('Antwort') }),
    ])
  })

  it('merges explicit post references and replies without duplicates', () => {
    const posts = [
      post({ id: 'root' }),
      post({
        id: 'both',
        parentId: 'root',
        references: [
          {
            id: 'ref-1',
            targetType: 'post',
            targetId: 'root',
            label: 'Root',
            available: true,
          },
        ],
      }),
    ]
    const inbound = buildInboundByPost(posts)
    expect(inbound.get('root')).toHaveLength(1)
  })

  it('excludes deleted inbound messages', () => {
    const posts = [
      post({ id: 'root' }),
      post({ id: 'reply', parentId: 'root', deleted: true }),
    ]
    expect(buildInboundByPost(posts).get('root')).toBeUndefined()
  })
})

describe('postsForThreadFilter', () => {
  it('returns the anchor and all inbound referencers', () => {
    const posts = [
      post({ id: 'root' }),
      post({ id: 'reply', parentId: 'root', bodyHtml: '<p>Antwort</p>' }),
      post({ id: 'other' }),
    ]
    const inbound = buildInboundByPost(posts)
    const filtered = postsForThreadFilter(posts, 'root', inbound)
    expect(filtered.map((entry) => entry.id)).toEqual(['root', 'reply'])
  })

  it('includes explicit post references without duplicates', () => {
    const posts = [
      post({ id: 'root' }),
      post({
        id: 'ref',
        references: [
          {
            id: 'ref-1',
            targetType: 'post',
            targetId: 'root',
            label: 'Root',
            available: true,
          },
        ],
      }),
      post({ id: 'noise' }),
    ]
    const inbound = buildInboundByPost(posts)
    const filtered = postsForThreadFilter(posts, 'root', inbound)
    expect(filtered.map((entry) => entry.id)).toEqual(['root', 'ref'])
  })
})

describe('isPostEdited', () => {
  it('is false when updatedAt is missing', () => {
    expect(isPostEdited(post({ id: 'a' }))).toBe(false)
  })

  it('is true when updatedAt is set', () => {
    expect(
      isPostEdited(
        post({
          id: 'a',
          updatedAt: '2026-01-01T11:30:00.000Z',
        }),
      ),
    ).toBe(true)
  })
})

describe('buildChatTimeline', () => {
  it('inserts date markers when the calendar day changes', () => {
    const posts = [
      post({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z' }),
    ]
    const timeline = buildChatTimeline(posts, 'oldest')
    expect(timeline.filter((i) => i.type === 'date')).toHaveLength(2)
    expect(timeline.filter((i) => i.type === 'message').map((i) => i.post.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('attaches parent preview for replies', () => {
    const posts = [
      post({ id: 'root', bodyHtml: '<p>Original text</p>' }),
      post({ id: 'reply', parentId: 'root', bodyHtml: '<p>Reply</p>' }),
    ]
    const timeline = buildChatTimeline(posts)
    const reply = timeline.find((i) => i.type === 'message' && i.post.id === 'reply')
    expect(reply?.type === 'message' && reply.parentPreview?.excerpt).toContain('Original')
    expect(reply?.type === 'message' && reply.parentPreview?.postId).toBe('root')
  })

  it('orders messages newest first when requested', () => {
    const posts = [
      post({ id: 'old', createdAt: '2026-01-01T10:00:00.000Z' }),
      post({ id: 'new', createdAt: '2026-01-02T10:00:00.000Z' }),
    ]
    const ids = buildChatTimeline(posts, 'recent')
      .filter((i) => i.type === 'message')
      .map((i) => i.post.id)
    expect(ids).toEqual(['new', 'old'])
  })
})
