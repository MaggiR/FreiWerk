import {
  MOOD_POLL_CHOICES,
  type MoodChoiceValue,
  type MoodPollChoice,
} from '../../shared/constants'

export type MoodCounts = Record<MoodChoiceValue, number>

export type MoodTrendPoint = { t: string } & MoodCounts

export type MoodVoteEvent = {
  userId: string
  choice: MoodChoiceValue
  createdAt: Date
}

function emptyCounts(): MoodCounts {
  return { approve: 0, reject: 0, abstain: 0, undecided: 0 }
}

function pollSnapshot(counts: MoodCounts): Pick<MoodCounts, MoodPollChoice> {
  return {
    approve: counts.approve,
    reject: counts.reject,
    abstain: counts.abstain,
  }
}

function pollCountsEqual(
  a: Pick<MoodCounts, MoodPollChoice>,
  b: Pick<MoodCounts, MoodPollChoice>,
): boolean {
  return (
    a.approve === b.approve &&
    a.reject === b.reject &&
    a.abstain === b.abstain
  )
}

/** Replay vote-change events; undecided choices are excluded from poll statistics. */
export function buildMoodTrend(events: MoodVoteEvent[]): MoodTrendPoint[] {
  const latestByUser = new Map<string, MoodChoiceValue>()
  const trend: MoodTrendPoint[] = []

  for (const event of events) {
    latestByUser.set(event.userId, event.choice)
    const snapshot = emptyCounts()
    for (const choice of latestByUser.values()) {
      if (choice === 'undecided') continue
      snapshot[choice]++
    }
    trend.push({ t: event.createdAt.toISOString(), ...snapshot })
  }

  return trend
}

/** Ensure the chart ends at the authoritative current distribution from mood_votes. */
export function appendTerminalTrendPoint(
  trend: MoodTrendPoint[],
  currentTotals: Pick<MoodCounts, MoodPollChoice>,
  at: Date = new Date(),
): MoodTrendPoint[] {
  const terminal: MoodTrendPoint = {
    t: at.toISOString(),
    ...currentTotals,
    undecided: 0,
  }

  const last = trend.at(-1)
  if (!last || !pollCountsEqual(pollSnapshot(last), currentTotals)) {
    return [...trend, terminal]
  }

  return trend
}

export function moodPollTotal(counts: Pick<MoodCounts, MoodPollChoice>): number {
  return MOOD_POLL_CHOICES.reduce((sum, choice) => sum + counts[choice], 0)
}
