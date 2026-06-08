import type { MotionStatus } from '../server/database/schema'

export interface MotionListItem {
  id: string
  title: string
  summary: string
  status: MotionStatus
  topic: string
  createdAt: string
  publishedAt: string | null
  debateEndsAt: string | null
  archivedAt: string | null
  authorId: string | null
  authorName: string | null
  isAnonymous: boolean
  divisionName: string | null
  postCount: number
  approvalCount: number
  rejectCount: number
  voteCount: number
  /** Present when the viewer is authenticated. */
  isWatched?: boolean
}
