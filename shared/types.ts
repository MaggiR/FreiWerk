import type {
  MotionStatus,
  MotionOutcome,
  UserRole,
} from '../server/database/schema'

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
  ballotEndsAt: string | null
  outcome: MotionOutcome | null
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

export interface MotionVersionItem {
  id: string
  versionNumber: number
  title: string
  summary: string
  bodyHtml: string
  createdAt: string
  createdById: string | null
  createdByName: string | null
}

/** A single open change suggestion, derived from the working document's marks. */
export interface SuggestionItem {
  id: number
  type: 'insertion' | 'deletion' | 'modification'
  authorId: string | null
  authorName: string | null
  /** ISO timestamp stamped when the suggestion was submitted. */
  createdAt: string | null
  /** Short plain-text preview of the affected content. */
  snippet: string
}

export interface MotionSuggestionsResponse {
  /** ProseMirror working-document JSON with suggestion marks, or null if none. */
  docJson: unknown | null
  /** Motion version number the working document is based on. */
  baseVersion: number
  /** Optimistic concurrency token. */
  revision: number
  suggestions: SuggestionItem[]
  openCount: number
}
