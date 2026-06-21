import type {
  MotionStatus,
  MotionOutcome,
  UserRole,
  ArgumentStance,
  ProposalStatus,
  ArgumentStatus,
  QuestionStatus,
  ResourceKind,
  ReferenceTargetType,
  ActivityType,
} from '../server/database/schema'

export interface UserProfile {
  id: string
  displayName: string
  fn: string | null
  role: UserRole
  avatarUrl: string | null
  createdAt: string
  division: { id: string; name: string } | null
  // Only populated for moderators/admins viewing the profile.
  bannedAt: string | null
  banReason: string | null
}

export interface UserProfilePageData {
  user: UserProfile
  isSelf: boolean
  // True when the viewer may use moderation controls (ban/unban) on this profile.
  canModerate: boolean
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
  authorAvatarUrl?: string | null
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

// ---------- Phase 6: deliberation ----------

export interface ArgumentItem {
  id: string
  stance: ArgumentStance
  title: string
  bodyHtml: string
  status: ProposalStatus
  deliberationStatus: ArgumentStatus
  authorId: string | null
  authorName: string | null
  createdAt: string
  upvoteCount: number
  upvotedByMe: boolean
  /** True when the current user authored this argument. */
  isMine: boolean
}

export interface ArgumentListResponse {
  arguments: ArgumentItem[]
  /** Whether the current user may moderate (accept/reject/status) arguments. */
  canModerate: boolean
}

export interface AnswerItem {
  id: string
  bodyHtml: string
  authorId: string | null
  authorName: string | null
  authorAvatarUrl: string | null
  createdAt: string
  upvoteCount: number
  upvotedByMe: boolean
  isAccepted: boolean
  isMine: boolean
}

export interface QuestionItem {
  id: string
  title: string
  bodyHtml: string
  status: QuestionStatus
  authorId: string | null
  authorName: string | null
  authorAvatarUrl: string | null
  createdAt: string
  upvoteCount: number
  upvotedByMe: boolean
  acceptedAnswerId: string | null
  isMine: boolean
  /** True when the current user may accept an answer (asker or moderator). */
  canAccept: boolean
  answers: AnswerItem[]
}

export interface QuestionListResponse {
  questions: QuestionItem[]
}

export interface ResourceItem {
  id: string
  title: string
  description: string | null
  kind: ResourceKind
  url: string
  status: ProposalStatus
  authorId: string | null
  authorName: string | null
  createdAt: string
  upvoteCount: number
  upvotedByMe: boolean
  isMine: boolean
}

export interface ResourceListResponse {
  resources: ResourceItem[]
  canModerate: boolean
}

export interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string | null
  actorName: string | null
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ActivityListResponse {
  events: ActivityItem[]
  nextCursor: string | null
}

/** Resolved preview of an inline reference target for rendering as a text block. */
export interface ReferencePreview {
  id: string
  targetType: ReferenceTargetType
  targetId: string
  /** Short label/snippet shown in the message (e.g. argument title, excerpt). */
  label: string
  /** True if the referenced element still exists / is resolvable. */
  available: boolean
}
