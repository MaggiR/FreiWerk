import { z } from 'zod'
import { TOPICS, MOOD_CHOICES, BALLOT_CHOICES } from '../../shared/constants'
import { isValidUploadUrl } from './uploads'

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(2).max(120),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(200),
})

export const motionCreateSchema = z.object({
  title: z.string().trim().min(5).max(200),
  summary: z.string().trim().min(50).max(200),
  // Raw TipTap HTML; sanitized server-side before persistence.
  bodyHtml: z.string().min(1).max(100_000),
  topic: z.enum(TOPICS),
  divisionId: z.string().uuid().nullable().optional(),
  isAnonymous: z.boolean().optional().default(false),
})

export const motionUpdateSchema = motionCreateSchema.partial()

export const publishSchema = z.object({
  // Optional custom debate length in days (author-defined, default applied server-side).
  debateDays: z.number().int().min(1).max(90).optional(),
})

export const postCreateSchema = z.object({
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
})

export const postListQuerySchema = z.object({
  sort: z.enum(['recent', 'oldest']).optional(),
})

export const archiveSchema = z.object({
  archived: z.boolean(),
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
