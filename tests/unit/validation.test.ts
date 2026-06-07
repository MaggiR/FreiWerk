import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  motionCreateSchema,
  moodVoteSchema,
  motionListQuerySchema,
} from '../../server/utils/validation'

describe('registerSchema', () => {
  it('normalizes email and accepts valid input', () => {
    const parsed = registerSchema.parse({
      email: '  Demo@FreiWerk.Local ',
      password: 'password123',
      displayName: 'Demo',
    })
    expect(parsed.email).toBe('demo@freiwerk.local')
  })

  it('rejects short passwords', () => {
    expect(() =>
      registerSchema.parse({
        email: 'a@b.de',
        password: 'short',
        displayName: 'Demo',
      }),
    ).toThrow()
  })
})

describe('loginSchema', () => {
  it('requires a non-empty password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.de', password: '' })).toThrow()
  })
})

const validSummary =
  'Nachhaltige Finanzierung digitaler Infrastruktur und Fortbildung an Schulen absichern.'

describe('motionCreateSchema', () => {
  it('accepts a valid motion', () => {
    const parsed = motionCreateSchema.parse({
      title: 'Ein sinnvoller Titel',
      summary: validSummary,
      bodyHtml: '<p>Inhalt</p>',
      topic: 'wirtschaft',
    })
    expect(parsed.topic).toBe('wirtschaft')
  })

  it('rejects summaries shorter than 50 characters', () => {
    expect(() =>
      motionCreateSchema.parse({
        title: 'Ein sinnvoller Titel',
        summary: 'Zu kurz.',
        bodyHtml: '<p>Inhalt</p>',
        topic: 'wirtschaft',
      }),
    ).toThrow()
  })

  it('rejects unknown topics', () => {
    expect(() =>
      motionCreateSchema.parse({
        title: 'Titel hier',
        summary: validSummary,
        bodyHtml: '<p>x</p>',
        topic: 'nonsense',
      }),
    ).toThrow()
  })
})

describe('moodVoteSchema', () => {
  it('only allows poll choices', () => {
    expect(moodVoteSchema.parse({ choice: 'approve' }).choice).toBe('approve')
    expect(() => moodVoteSchema.parse({ choice: 'maybe' })).toThrow()
    expect(() => moodVoteSchema.parse({ choice: 'undecided' })).toThrow()
  })
})

describe('motionListQuerySchema', () => {
  it('passes through valid optional filters', () => {
    const parsed = motionListQuerySchema.parse({ status: 'debate', sort: 'active' })
    expect(parsed.status).toBe('debate')
    expect(parsed.sort).toBe('active')
  })
})
