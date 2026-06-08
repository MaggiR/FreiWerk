import { describe, it, expect } from 'vitest'
import {
  ANONYMOUS_AUTHOR_LABEL,
  redactMotionAuthor,
} from '../../server/utils/motionAnonymity'

describe('redactMotionAuthor', () => {
  const row = {
    authorId: 'author-1',
    authorName: 'Anna Schneider',
    isAnonymous: true,
  }

  it('leaves named motions unchanged', () => {
    expect(
      redactMotionAuthor(
        { ...row, isAnonymous: false },
        'viewer-2',
      ),
    ).toEqual({
      authorId: 'author-1',
      authorName: 'Anna Schneider',
      isAnonymous: false,
    })
  })

  it('hides the author from other viewers', () => {
    expect(redactMotionAuthor(row, 'viewer-2')).toEqual({
      authorId: null,
      authorName: ANONYMOUS_AUTHOR_LABEL,
      isAnonymous: true,
    })
  })

  it('keeps authorId for the owner while masking the display name', () => {
    expect(redactMotionAuthor(row, 'author-1')).toEqual({
      authorId: 'author-1',
      authorName: ANONYMOUS_AUTHOR_LABEL,
      isAnonymous: true,
    })
  })
})
