import { describe, it, expect } from 'vitest'
import { computeBallotOutcome, emptyBallotCounts } from '../../server/utils/ballot'

describe('computeBallotOutcome', () => {
  it('accepts when approvals outnumber rejections', () => {
    expect(computeBallotOutcome({ approve: 5, reject: 3, abstain: 2 })).toBe(
      'accepted',
    )
  })

  it('rejects when rejections outnumber approvals', () => {
    expect(computeBallotOutcome({ approve: 2, reject: 4, abstain: 1 })).toBe(
      'rejected',
    )
  })

  it('rejects on a tie', () => {
    expect(computeBallotOutcome({ approve: 3, reject: 3, abstain: 5 })).toBe(
      'rejected',
    )
  })

  it('rejects an empty ballot', () => {
    expect(computeBallotOutcome(emptyBallotCounts())).toBe('rejected')
  })

  it('ignores abstentions when deciding', () => {
    expect(computeBallotOutcome({ approve: 1, reject: 0, abstain: 99 })).toBe(
      'accepted',
    )
  })
})
