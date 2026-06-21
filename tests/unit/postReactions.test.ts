import { describe, it, expect } from 'vitest'
import { aggregatePostReactions } from '../../server/utils/postReactions'

describe('aggregatePostReactions', () => {
  it('groups reactions per post and marks the current user', () => {
    const map = aggregatePostReactions(
      [
        { postId: 'p1', emoji: '👍', userId: 'u1' },
        { postId: 'p1', emoji: '👍', userId: 'u2' },
        { postId: 'p1', emoji: '❤️', userId: 'u1' },
        { postId: 'p2', emoji: '🔥', userId: 'u3' },
      ],
      'u1',
    )

    expect(map.get('p1')).toEqual([
      { emoji: '👍', count: 2, reactedByMe: true },
      { emoji: '❤️', count: 1, reactedByMe: true },
    ])
    expect(map.get('p2')).toEqual([{ emoji: '🔥', count: 1, reactedByMe: false }])
  })
})
