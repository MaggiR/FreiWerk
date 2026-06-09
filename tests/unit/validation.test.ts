import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  motionCreateSchema,
  moodVoteSchema,
  motionListQuerySchema,
  archiveSchema,
  profileUpdateSchema,
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
    expect(parsed.isAnonymous).toBe(false)
  })

  it('accepts anonymous submissions', () => {
    const parsed = motionCreateSchema.parse({
      title: 'Ein sinnvoller Titel',
      summary: validSummary,
      bodyHtml: '<p>Inhalt</p>',
      topic: 'wirtschaft',
      isAnonymous: true,
    })
    expect(parsed.isAnonymous).toBe(true)
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
    expect(moodVoteSchema.parse({ choice: 'undecided' }).choice).toBe('undecided')
    expect(() => moodVoteSchema.parse({ choice: 'maybe' })).toThrow()
  })
})

describe('motionListQuerySchema', () => {
  it('passes through valid optional filters', () => {
    const parsed = motionListQuerySchema.parse({ status: 'debate', sort: 'active' })
    expect(parsed.status).toBe('debate')
    expect(parsed.sort).toBe('active')
  })

  it('accepts popular and controversial sort and date/support filters', () => {
    expect(motionListQuerySchema.parse({ sort: 'popular' }).sort).toBe('popular')
    expect(motionListQuerySchema.parse({ sort: 'unpopular' }).sort).toBe('unpopular')
    expect(motionListQuerySchema.parse({ sort: 'mostWatched' }).sort).toBe('mostWatched')

    const parsed = motionListQuerySchema.parse({
      sort: 'controversial',
      publishedFrom: '2026-01-01',
      publishedTo: '2026-06-30',
      minSupport: '50',
    })
    expect(parsed.sort).toBe('controversial')
    expect(parsed.publishedFrom).toBe('2026-01-01')
    expect(parsed.publishedTo).toBe('2026-06-30')
    expect(parsed.minSupport).toBe(50)
  })

  it('parses watched/archived flags only when literally "true"', () => {
    expect(motionListQuerySchema.parse({ watched: 'true' }).watched).toBe(true)
    expect(motionListQuerySchema.parse({ archived: 'false' }).archived).toBe(false)
    expect(motionListQuerySchema.parse({}).watched).toBe(false)
  })
})

describe('archiveSchema', () => {
  it('requires a boolean archived flag', () => {
    expect(archiveSchema.parse({ archived: true }).archived).toBe(true)
    expect(() => archiveSchema.parse({ archived: 'yes' })).toThrow()
  })
})

describe('profileUpdateSchema', () => {
  it('accepts valid profile fields', () => {
    const parsed = profileUpdateSchema.parse({
      displayName: ' Demo ',
      fn: '',
      divisionId: null,
      avatarUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
    })
    expect(parsed.displayName).toBe('Demo')
    expect(parsed.fn).toBeNull()
    expect(parsed.avatarUrl).toBe('/uploads/550e8400-e29b-41d4-a716-446655440000.png')
  })

  it('rejects empty updates and invalid avatar URLs', () => {
    expect(() => profileUpdateSchema.parse({})).toThrow()
    expect(() =>
      profileUpdateSchema.parse({ avatarUrl: 'https://evil.example/a.png' }),
    ).toThrow()
  })
})
