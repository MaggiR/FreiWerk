import { chatDayKey, htmlPreview } from '~/utils/chatDates'
import { POST_EDIT_WINDOW_MS } from '#shared/constants'
import type { ReferencePreview } from '#shared/types'

/** A Telegram-style quote draft attached to the composer. */
export interface DebateQuoteDraft {
  postId: string
  authorName: string | null
  excerpt: string
}

export interface DebatePost {
  id: string
  parentId: string | null
  createdAt: string
  updatedAt: string | null
  deleted: boolean
  bodyHtml: string
  authorId: string | null
  authorName: string | null
  authorFn: string | null
  authorRole: string | null
  authorAvatarUrl: string | null
  upvoteCount: number
  upvotedByMe: boolean
  savedByMe: boolean
  references: ReferencePreview[]
  referencedByCount: number
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
      parentPreview: { postId: string; authorName: string | null; excerpt: string } | null
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

    let parentPreview: { postId: string; authorName: string | null; excerpt: string } | null = null
    if (post.parentId) {
      const parent = byId.get(post.parentId)
      if (parent && !parent.deleted) {
        parentPreview = {
          postId: parent.id,
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

/** Whether a post body was edited after it was first published. */
export function isPostEdited(post: Pick<DebatePost, 'updatedAt'>): boolean {
  return post.updatedAt != null
}

/** Number of posts that still have visible content (tombstones excluded). */
export function countVisiblePosts(posts: DebatePost[]): number {
  return posts.reduce((sum, post) => sum + (post.deleted ? 0 : 1), 0)
}

/** Whether the author may still edit this post during an open debate. */
export function isOwnPostEditable(
  post: DebatePost,
  userId: string | null | undefined,
  debateOpen: boolean,
  now = Date.now(),
): boolean {
  if (!debateOpen || !userId || post.deleted) return false
  if (post.authorId !== userId) return false
  return now - new Date(post.createdAt).getTime() <= POST_EDIT_WINDOW_MS
}

/** Most recent own post that is still within the edit window, if any. */
export function findLatestEditableOwnPost(
  posts: DebatePost[],
  userId: string | null | undefined,
  debateOpen: boolean,
  now = Date.now(),
): DebatePost | null {
  if (!userId) return null
  let latest: DebatePost | null = null
  for (const post of posts) {
    if (!isOwnPostEditable(post, userId, debateOpen, now)) continue
    if (
      !latest ||
      new Date(post.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = post
    }
  }
  return latest
}

export interface InboundRefPreview {
  id: string
  authorName: string | null
  excerpt: string
}

/**
 * Map post id → messages that reference it via explicit post reference or direct reply.
 * Each source post appears at most once per target; deleted sources are excluded.
 */
export function buildInboundByPost(posts: DebatePost[]): Map<string, DebatePost[]> {
  const map = new Map<string, DebatePost[]>()

  function addInbound(targetId: string, source: DebatePost) {
    if (source.deleted) return
    const list = map.get(targetId) ?? []
    if (list.some((item) => item.id === source.id)) return
    list.push(source)
    map.set(targetId, list)
  }

  for (const post of posts) {
    if (post.parentId) {
      addInbound(post.parentId, post)
    }
    for (const ref of post.references) {
      if (ref.targetType !== 'post') continue
      addInbound(ref.targetId, post)
    }
  }

  for (const list of map.values()) {
    list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }

  return map
}

export function inboundRefsFor(
  inboundByPost: Map<string, DebatePost[]>,
  postId: string,
  excerptLength = 60,
): InboundRefPreview[] {
  return (inboundByPost.get(postId) ?? []).map((post) => ({
    id: post.id,
    authorName: post.authorName,
    excerpt: htmlPreview(post.bodyHtml, excerptLength),
  }))
}

/** Posts visible when filtering a thread: anchor plus all inbound referencers. */
export function postsForThreadFilter(
  posts: DebatePost[],
  anchorPostId: string,
  inboundByPost: Map<string, DebatePost[]>,
): DebatePost[] {
  const ids = new Set<string>([anchorPostId])
  for (const inbound of inboundByPost.get(anchorPostId) ?? []) {
    ids.add(inbound.id)
  }
  return posts.filter((post) => ids.has(post.id))
}
