import type { MotionStatus, UserRole } from '../server/database/schema'

export interface UserProfile {
  id: string
  displayName: string
  fn: string | null
  role: UserRole
  avatarUrl: string | null
  createdAt: string
  division: { id: string; name: string } | null
}

export interface UserProfilePageData {
  user: UserProfile
  isSelf: boolean
  motions: MotionListItem[]
  watched: MotionListItem[]
}

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
