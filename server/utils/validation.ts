import { z } from 'zod'
import {
  TOPICS,
  MOOD_CHOICES,
  BALLOT_CHOICES,
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
  ARGUMENT_STANCES,
  ARGUMENT_TITLE_MIN,
  ARGUMENT_TITLE_MAX,
  QUESTION_TITLE_MIN,
  QUESTION_TITLE_MAX,
  RESOURCE_TITLE_MIN,
  RESOURCE_TITLE_MAX,
} from '../../shared/constants'
import { isValidUploadUrl, isValidUploadFileUrl } from './uploads'

// Only allow internal, absolute redirect paths to avoid open-redirect abuse.
const redirectPathSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => value.startsWith('/') && !value.startsWith('//'),
    'Ungültiger Weiterleitungspfad.',
  )

// Request a passwordless login: an email gets a one-time magic link.
export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  redirect: redirectPathSchema.optional(),
})

// Redeem a magic link via the token from the email.
export const magicLinkVerifySchema = z.object({
  token: z.string().trim().min(10).max(512),
})

// Initial profile setup after the first magic-link login (Stammdaten). The
// display name is composed from first and last name; the avatar is optional.
export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  fn: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .refine(
      (value) => value == null || isValidUploadUrl(value),
      'Ungültige Profilbild-URL.',
    ),
})

export const motionCreateSchema = z.object({
  title: z.string().trim().min(MOTION_TITLE_MIN).max(MOTION_TITLE_MAX),
  summary: z.string().trim().min(MOTION_SUMMARY_MIN).max(MOTION_SUMMARY_MAX),
  // Raw TipTap HTML; sanitized server-side before persistence.
  bodyHtml: z.string().min(1).max(100_000),
  topic: z.enum(TOPICS),
  divisionId: z.string().uuid().nullable().optional(),
  isAnonymous: z.boolean().optional().default(false),
})

/** Relaxed schema for draft autosave (create + patch). Publish uses motionCreateSchema. */
export const motionDraftSaveSchema = z.object({
  title: z.string().trim().max(MOTION_TITLE_MAX).optional().default(''),
  summary: z.string().trim().max(MOTION_SUMMARY_MAX).optional().default(''),
  bodyHtml: z.string().max(100_000).optional().default(''),
  topic: z.union([z.enum(TOPICS), z.literal('')]).optional(),
  divisionId: z.string().uuid().nullable().optional(),
  isAnonymous: z.boolean().optional(),
})

export const motionDraftUpdateSchema = motionDraftSaveSchema.partial()

export const motionUpdateSchema = motionCreateSchema.partial()

export const publishSchema = z.object({
  // Optional custom debate length in days (author-defined, default applied server-side).
  debateDays: z.number().int().min(1).max(90).optional(),
})

// An inline reference from a message to a deliberation element. For a
// 'motion_excerpt', targetId is the motionId and excerptText holds the marked
// passage (with the version it was taken from for anchoring).
export const referenceInputSchema = z.object({
  targetType: z.enum(['argument', 'question', 'answer', 'resource', 'post', 'motion_excerpt']),
  targetId: z.string().uuid(),
  excerptText: z.string().trim().min(1).max(500).optional(),
  excerptVersion: z.number().int().min(0).optional(),
})

export const postCreateSchema = z.object({
  bodyHtml: z.string().min(1).max(50_000),
  // Optional parent for threaded replies; omitted/undefined = top-level post.
  parentId: z.string().uuid().optional(),
  // Optional inline references to one or more deliberation elements.
  references: z.array(referenceInputSchema).max(20).optional(),
  // Optional URL to unfurl as a link preview card (must appear in bodyHtml).
  linkPreviewUrl: z.string().url().max(2000).optional(),
})

export const postUpdateSchema = z.object({
  bodyHtml: z.string().min(1).max(50_000),
})

// A ProseMirror document node (top-level). Structural allow-list validation of
// nodes/marks happens in server/utils/suggestions.ts (validateWorkingDoc).
const proseMirrorDocSchema = z
  .object({ type: z.literal('doc') })
  .passthrough()

// PUT /suggestions: a member stores the shared working document (ProseMirror JSON
// with suggestion marks). baseRevision drives the optimistic concurrency check.
export const suggestionSubmitSchema = z.object({
  docJson: proseMirrorDocSchema,
  baseRevision: z.number().int().min(0),
})

// POST /suggestions/save (author): bake accepted suggestions into a new version.
// cleanHtml is the resolved motion text (sanitized server-side); workingDocJson is
// the rebased working document, or null when no open suggestions remain.
export const suggestionSaveSchema = z.object({
  cleanHtml: z.string().min(1).max(100_000),
  workingDocJson: proseMirrorDocSchema.nullable(),
  baseRevision: z.number().int().min(0),
  title: z.string().trim().min(MOTION_TITLE_MIN).max(MOTION_TITLE_MAX).optional(),
  summary: z.string().trim().min(MOTION_SUMMARY_MIN).max(MOTION_SUMMARY_MAX).optional(),
})

export const moodVoteSchema = z.object({
  choice: z.enum(MOOD_CHOICES),
})

// Opening the formal ballot phase: optional custom ballot length in days.
export const ballotStartSchema = z.object({
  ballotDays: z.number().int().min(1).max(30).optional(),
})

// Casting a secret ballot. Only definite positions — no "undecided".
export const ballotVoteSchema = z.object({
  choice: z.enum(BALLOT_CHOICES),
})

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .optional()

// Query string boolean flag: only the literal 'true' enables the flag.
const booleanFlagSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true')

export const motionListQuerySchema = z.object({
  status: z.enum(['draft', 'debate', 'ballot', 'decided']).optional(),
  topic: z.enum(TOPICS).optional(),
  divisionId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  authorId: z.string().uuid().optional(),
  sort: z
    .enum(['recent', 'active', 'controversial', 'popular', 'unpopular', 'mostWatched'])
    .optional(),
  publishedFrom: isoDateSchema,
  publishedTo: isoDateSchema,
  minSupport: z.coerce.number().int().min(0).max(100).optional(),
  // Restrict results to motions the current user watches.
  watched: booleanFlagSchema,
  // Open ballots the current user has not voted in yet.
  ballotPending: booleanFlagSchema,
  // Show archived instead of active motions.
  archived: booleanFlagSchema,
  // Exclude drafts even for the current author (e.g. public homepage lists).
  publishedOnly: booleanFlagSchema,
})

export const postListQuerySchema = z.object({
  sort: z.enum(['recent', 'oldest']).optional(),
})

export const activityListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().trim().min(1).max(80).optional(),
})

export const archiveSchema = z.object({
  archived: z.boolean(),
})

// ---------- Phase 5: moderation & reports ----------

// A member reports a motion or a debate post. The reason is mandatory.
export const reportCreateSchema = z.object({
  targetType: z.enum(['motion', 'post']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(10).max(1000),
})

export const reportListQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
})

// A moderator resolves or dismisses a report. The note is mandatory either way.
export const reportResolveSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  resolutionNote: z.string().trim().min(3).max(1000),
})

// A moderator removes a debate post (soft delete). Reason is mandatory.
export const postModerationDeleteSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
})

// A moderator/admin bans a member. Reason is mandatory.
export const userBanSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
})

export const motionExportQuerySchema = z.object({
  format: z.enum(['markdown']).optional(),
})

// ---------- Phase 6: deliberation ----------

// Toggle a generic upvote on any deliberation element (no downvotes).
export const upvoteToggleSchema = z.object({
  targetType: z.enum(['argument', 'question', 'answer', 'resource', 'post']),
  targetId: z.string().uuid(),
})

// Create/propose a pro or contra argument. Author-authored ones are accepted
// immediately; member proposals enter the author's moderation queue.
export const argumentCreateSchema = z.object({
  stance: z.enum(ARGUMENT_STANCES),
  title: z.string().trim().min(ARGUMENT_TITLE_MIN).max(ARGUMENT_TITLE_MAX),
  bodyHtml: z.string().min(1).max(20_000),
})

// Author/moderator updates an argument's approval and/or deliberation status.
export const argumentUpdateSchema = z
  .object({
    status: z.enum(['accepted', 'rejected']).optional(),
    deliberationStatus: z.enum(['open', 'confirmed', 'refuted']).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined || value.deliberationStatus !== undefined,
    'Mindestens ein Feld muss gesetzt sein.',
  )

// Ask a Q&A question (no approval needed).
export const questionCreateSchema = z.object({
  title: z.string().trim().min(QUESTION_TITLE_MIN).max(QUESTION_TITLE_MAX),
  bodyHtml: z.string().max(20_000).optional().default(''),
})

// Answer a question.
export const answerCreateSchema = z.object({
  bodyHtml: z.string().min(1).max(20_000),
})

// Accept (or clear) the accepted answer of a question.
export const questionUpdateSchema = z.object({
  acceptedAnswerId: z.string().uuid().nullable(),
})

// Propose a resource: an external link or an uploaded file.
export const resourceCreateSchema = z
  .object({
    title: z.string().trim().min(RESOURCE_TITLE_MIN).max(RESOURCE_TITLE_MAX),
    description: z
      .string()
      .trim()
      .max(500)
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .optional(),
    kind: z.enum(['link', 'file']),
    url: z.string().trim().min(1).max(2000),
  })
  .refine(
    (value) =>
      value.kind === 'link'
        ? /^https?:\/\/.+/i.test(value.url)
        : isValidUploadFileUrl(value.url),
    'Ungültige Ressourcen-URL.',
  )

// Author/moderator accepts or rejects a proposed resource.
export const resourceUpdateSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
})

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120).optional(),
    fn: z
      .string()
      .trim()
      .max(120)
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .optional(),
    divisionId: z.string().uuid().nullable().optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .refine(
        (value) => value == null || isValidUploadUrl(value),
        'Ungültige Profilbild-URL.',
      ),
  })
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.fn !== undefined ||
      value.divisionId !== undefined ||
      value.avatarUrl !== undefined,
    'Mindestens ein Feld muss gesetzt sein.',
  )
