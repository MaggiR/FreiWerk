import { chatDayKey, htmlPreview } from '~/utils/chatDates'

export interface PostReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface DebatePost {
  id: string
  parentId: string | null
  createdAt: string
  deleted: boolean
  bodyHtml: string
  authorId: string | null
  authorName: string | null
  authorFn: string | null
  authorAvatarUrl: string | null
  reactions: PostReactionSummary[]
}

export interface DebateNode {
  post: DebatePost
  children: DebateNode[]
}

export type ChatTimelineItem =
  | { type: 'date'; key: string; label: string }
  | {
      type: 'message'
      post: DebatePost
      parentPreview: { authorName: string | null; excerpt: string } | null
    }

/**
 * Flat messenger timeline: chronological messages with date separators inserted
 * whenever the calendar day changes. Replies stay in order; parent context is
 * attached for inline quote rendering.
 */
export function buildChatTimeline(
  posts: DebatePost[],
  sort: 'recent' | 'oldest' = 'oldest',
): ChatTimelineItem[] {
  const byId = new Map(posts.map((p) => [p.id, p]))
  const sorted = [...posts].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return sort === 'recent' ? -diff : diff
  })

  const items: ChatTimelineItem[] = []
  let lastDayKey: string | null = null

  for (const post of sorted) {
    const dayKey = chatDayKey(post.createdAt)
    if (dayKey !== lastDayKey) {
      items.push({
        type: 'date',
        key: dayKey,
        label: '', // filled by component with formatChatDateLabel for reactivity
      })
      lastDayKey = dayKey
    }

    let parentPreview: { authorName: string | null; excerpt: string } | null = null
    if (post.parentId) {
      const parent = byId.get(post.parentId)
      if (parent && !parent.deleted) {
        parentPreview = {
          authorName: parent.authorName,
          excerpt: htmlPreview(parent.bodyHtml, 80),
        }
      }
    }

    items.push({ type: 'message', post, parentPreview })
  }

  return items
}

/**
 * Assemble a flat list into a reply tree (legacy). Prefer buildChatTimeline for
 * the messenger UI.
 */
export function buildThreadTree(
  posts: DebatePost[],
  topSort: 'recent' | 'oldest' = 'oldest',
): DebateNode[] {
  const byId = new Map<string, DebateNode>()
  for (const post of posts) {
    byId.set(post.id, { post, children: [] })
  }

  const roots: DebateNode[] = []
  for (const post of posts) {
    const node = byId.get(post.id)
    if (!node) continue
    const parent = post.parentId ? byId.get(post.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const byTime = (a: DebateNode, b: DebateNode) =>
    new Date(a.post.createdAt).getTime() - new Date(b.post.createdAt).getTime()

  roots.sort((a, b) => (topSort === 'recent' ? byTime(b, a) : byTime(a, b)))
  return roots
}

/** Number of posts that still have visible content (tombstones excluded). */
export function countVisiblePosts(posts: DebatePost[]): number {
  return posts.reduce((sum, post) => sum + (post.deleted ? 0 : 1), 0)
}
