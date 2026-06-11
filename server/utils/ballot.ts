import type { MotionOutcome } from '../database/schema'

export interface BallotCounts {
  approve: number
  reject: number
  abstain: number
}

/**
 * Determine the outcome of a finalized ballot. Abstentions do not count toward
 * the result; a motion is accepted only with a strict majority of approvals over
 * rejections. Ties (including an empty ballot) are rejected.
 *
 * Quorums are intentionally out of scope — the result is a simple majority.
 */
export function computeBallotOutcome(counts: BallotCounts): MotionOutcome {
  return counts.approve > counts.reject ? 'accepted' : 'rejected'
}

export function emptyBallotCounts(): BallotCounts {
  return { approve: 0, reject: 0, abstain: 0 }
}
