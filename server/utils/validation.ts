import { z } from 'zod'
import { TOPICS, MOOD_CHOICES } from '../../shared/constants'

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
  summary: z.string().trim().min(10).max(500),
  // Raw TipTap HTML; sanitized server-side before persistence.
  bodyHtml: z.string().min(1).max(100_000),
  topic: z.enum(TOPICS),
  divisionId: z.string().uuid().nullable().optional(),
})

export const motionUpdateSchema = motionCreateSchema.partial()

export const publishSchema = z.object({
  // Optional custom debate length in days (author-defined, default applied server-side).
  debateDays: z.number().int().min(1).max(90).optional(),
})

export const postCreateSchema = z.object({
  bodyHtml: z.string().min(1).max(50_000),
})

export const moodVoteSchema = z.object({
  choice: z.enum(MOOD_CHOICES),
})

export const motionListQuerySchema = z.object({
  status: z.enum(['draft', 'debate', 'ballot', 'decided']).optional(),
  topic: z.enum(TOPICS).optional(),
  divisionId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  authorId: z.string().uuid().optional(),
  sort: z.enum(['recent', 'active']).optional(),
})
