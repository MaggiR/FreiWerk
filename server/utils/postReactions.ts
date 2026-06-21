export interface PostReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
}

interface ReactionRow {
  postId: string
  emoji: string
  userId: string
}

/** Aggregate raw reaction rows into per-post summaries for the chat UI. */
export function aggregatePostReactions(
  rows: ReactionRow[],
  currentUserId: string | undefined,
): Map<string, PostReactionSummary[]> {
  const byPost = new Map<string, Map<string, PostReactionSummary>>()

  for (const row of rows) {
    let emojis = byPost.get(row.postId)
    if (!emojis) {
      emojis = new Map()
      byPost.set(row.postId, emojis)
    }
    const existing = emojis.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      reactedByMe: false,
    }
    existing.count += 1
    if (currentUserId && row.userId === currentUserId) {
      existing.reactedByMe = true
    }
    emojis.set(row.emoji, existing)
  }

  const result = new Map<string, PostReactionSummary[]>()
  for (const [postId, emojis] of byPost) {
    const list = [...emojis.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
    result.set(postId, list)
  }
  return result
}
