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
  authorId: string
  authorName: string | null
  divisionName: string | null
  postCount: number
  approvalCount: number
  rejectCount: number
  voteCount: number
}
