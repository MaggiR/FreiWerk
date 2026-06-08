import { describe, it, expect } from 'vitest'
import {
  MOOD_TIMELINES_BY_TITLE,
  buildMoodRows,
  daysAgo,
} from '../../server/database/seed-data'
import {
  appendTerminalTrendPoint,
  buildMoodTrend,
  moodPollTotal,
  type MoodCounts,
} from '../../server/utils/moodTrend'
import { MOOD_POLL_CHOICES, type MoodChoiceValue } from '../../shared/constants'

function pollTotalsFromVotes(
  votes: { choice: MoodChoiceValue }[],
): Pick<MoodCounts, (typeof MOOD_POLL_CHOICES)[number]> {
  const totals = { approve: 0, reject: 0, abstain: 0 }
  for (const vote of votes) {
    if (vote.choice === 'undecided') continue
    totals[vote.choice]++
  }
  return totals
}

describe('buildMoodTrend', () => {
  it('excludes undecided votes from poll snapshots', () => {
    const now = new Date('2026-06-09T12:00:00Z')
    const trend = buildMoodTrend([
      {
        userId: 'u1',
        choice: 'undecided',
        createdAt: daysAgo(now, 2),
      },
      {
        userId: 'u2',
        choice: 'approve',
        createdAt: daysAgo(now, 1),
      },
      {
        userId: 'u1',
        choice: 'approve',
        createdAt: daysAgo(now, 0),
      },
    ])

    const last = trend.at(-1)!
    expect(last.approve).toBe(2)
    expect(last.reject).toBe(0)
    expect(last.abstain).toBe(0)
    expect(last.undecided).toBe(0)
    expect(moodPollTotal(last)).toBe(2)
  })

  it('matches seed mood_votes after replaying seed events', () => {
    const now = new Date('2026-06-09T12:00:00Z')
    for (const [title, timelines] of Object.entries(MOOD_TIMELINES_BY_TITLE)) {
      const userIdByEmail = Object.fromEntries(
        timelines.map((timeline, userIndex) => [
          timeline.userEmail,
          `user-${userIndex}`,
        ]),
      )
      const motionId = `motion-${title}`
      const { votes, events } = buildMoodRows(
        motionId,
        timelines,
        userIdByEmail,
        now,
      )
      const expected = pollTotalsFromVotes(votes)
      const trend = buildMoodTrend(
        events.map((event) => ({
          userId: event.userId,
          choice: event.choice,
          createdAt: event.createdAt,
        })),
      )

      const last = trend.at(-1)!
      expect(last, title).toEqual(
        expect.objectContaining({
          approve: expected.approve,
          reject: expected.reject,
          abstain: expected.abstain,
          undecided: 0,
        }),
      )
    }
  })
})

describe('appendTerminalTrendPoint', () => {
  it('appends a point when replayed trend diverges from current totals', () => {
    const trend = buildMoodTrend([
      {
        userId: 'u1',
        choice: 'approve',
        createdAt: new Date('2026-06-08T10:00:00Z'),
      },
    ])

    const synced = appendTerminalTrendPoint(
      trend,
      { approve: 2, reject: 1, abstain: 0 },
      new Date('2026-06-09T10:00:00Z'),
    )

    expect(synced).toHaveLength(2)
    expect(synced.at(-1)).toMatchObject({
      approve: 2,
      reject: 1,
      abstain: 0,
      t: '2026-06-09T10:00:00.000Z',
    })
  })

  it('does not duplicate when replay already matches current totals', () => {
    const trend = buildMoodTrend([
      {
        userId: 'u1',
        choice: 'approve',
        createdAt: new Date('2026-06-09T10:00:00Z'),
      },
      {
        userId: 'u2',
        choice: 'reject',
        createdAt: new Date('2026-06-09T11:00:00Z'),
      },
    ])

    const synced = appendTerminalTrendPoint(trend, {
      approve: 1,
      reject: 1,
      abstain: 0,
    })

    expect(synced).toHaveLength(trend.length)
  })
})
