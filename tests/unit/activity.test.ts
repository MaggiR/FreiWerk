import { describe, it, expect } from 'vitest'
import {
  encodeActivityCursor,
  parseActivityCursor,
} from '../../server/utils/activity'
import { activityListQuerySchema } from '../../server/utils/validation'

describe('activity cursor helpers', () => {
  it('round-trips createdAt and id', () => {
    const createdAt = '2026-06-08T12:00:00.000Z'
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const cursor = encodeActivityCursor(createdAt, id)
    expect(parseActivityCursor(cursor)).toEqual({
      createdAt: new Date(createdAt),
      id,
    })
  })

  it('rejects malformed cursors', () => {
    expect(parseActivityCursor('not-a-cursor')).toBeNull()
    expect(parseActivityCursor('2026-06-08T12:00:00.000Z|')).toBeNull()
  })
})

describe('activityListQuerySchema', () => {
  it('defaults limit to 25', () => {
    expect(activityListQuerySchema.parse({})).toEqual({ limit: 25 })
  })

  it('accepts cursor and bounded limit', () => {
    expect(
      activityListQuerySchema.parse({
        limit: '10',
        cursor: '2026-06-08T12:00:00.000Z|abc',
      }),
    ).toEqual({
      limit: 10,
      cursor: '2026-06-08T12:00:00.000Z|abc',
    })
  })

  it('rejects limit above 50', () => {
    expect(() => activityListQuerySchema.parse({ limit: 51 })).toThrow()
  })
})
