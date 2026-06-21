import { describe, it, expect } from 'vitest'
import {
  buildThreadTree,
  buildChatTimeline,
  countVisiblePosts,
  type DebatePost,
} from '../../app/utils/debate'

function post(partial: Partial<DebatePost> & { id: string }): DebatePost {
  return {
    id: partial.id,
    parentId: partial.parentId ?? null,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    deleted: partial.deleted ?? false,
    bodyHtml: partial.bodyHtml ?? '<p>Text</p>',
    authorId: partial.authorId ?? 'u1',
    authorName: partial.authorName ?? 'Demo',
    authorFn: partial.authorFn ?? null,
    authorRole: partial.authorRole ?? null,
    authorAvatarUrl: partial.authorAvatarUrl ?? null,
    upvoteCount: partial.upvoteCount ?? 0,
    upvotedByMe: partial.upvotedByMe ?? false,
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
