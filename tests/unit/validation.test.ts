import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  motionCreateSchema,
  motionDraftSaveSchema,
  moodVoteSchema,
  motionListQuerySchema,
  archiveSchema,
  profileUpdateSchema,
  suggestionSubmitSchema,
  suggestionSaveSchema,
  ballotStartSchema,
  ballotVoteSchema,
  postCreateSchema,
  reportCreateSchema,
  reportResolveSchema,
  postModerationDeleteSchema,
  userBanSchema,
  upvoteToggleSchema,
  argumentCreateSchema,
  argumentUpdateSchema,
  questionCreateSchema,
  answerCreateSchema,
  questionUpdateSchema,
  resourceCreateSchema,
  resourceUpdateSchema,
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

  it('rejects titles shorter than 10 characters', () => {
    expect(() =>
      motionCreateSchema.parse({
        title: 'Kurz',
        summary: validSummary,
        bodyHtml: '<p>Inhalt</p>',
        topic: 'wirtschaft',
      }),
    ).toThrow()
  })

  it('rejects titles longer than 150 characters', () => {
    expect(() =>
      motionCreateSchema.parse({
        title: 'T'.repeat(151),
        summary: validSummary,
        bodyHtml: '<p>Inhalt</p>',
        topic: 'wirtschaft',
      }),
    ).toThrow()
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

describe('motionDraftSaveSchema', () => {
  it('accepts empty draft fields for autosave', () => {
    const parsed = motionDraftSaveSchema.parse({})
    expect(parsed.title).toBe('')
    expect(parsed.summary).toBe('')
    expect(parsed.bodyHtml).toBe('')
  })

  it('accepts partial title and summary below publish minimums', () => {
    const parsed = motionDraftSaveSchema.parse({
      title: 'Kurz',
      summary: 'Zu kurz.',
      bodyHtml: '<p></p>',
      topic: '',
    })
    expect(parsed.title).toBe('Kurz')
    expect(parsed.summary).toBe('Zu kurz.')
  })

  it('still rejects titles longer than the maximum', () => {
    expect(() =>
      motionDraftSaveSchema.parse({
        title: 'T'.repeat(151),
      }),
    ).toThrow()
  })
})

describe('suggestionSubmitSchema', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph' }] }

  it('accepts a ProseMirror doc with a base revision', () => {
    const parsed = suggestionSubmitSchema.parse({ docJson: doc, baseRevision: 3 })
    expect(parsed.baseRevision).toBe(3)
    expect(parsed.docJson.type).toBe('doc')
  })

  it('rejects a non-doc root and negative revisions', () => {
    expect(() =>
      suggestionSubmitSchema.parse({ docJson: { type: 'paragraph' }, baseRevision: 0 }),
    ).toThrow()
    expect(() =>
      suggestionSubmitSchema.parse({ docJson: doc, baseRevision: -1 }),
    ).toThrow()
  })
})

describe('suggestionSaveSchema', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph' }] }

  it('accepts clean HTML with a working doc or null', () => {
    const withDoc = suggestionSaveSchema.parse({
      cleanHtml: '<p>Inhalt</p>',
      workingDocJson: doc,
      baseRevision: 1,
    })
    expect(withDoc.workingDocJson?.type).toBe('doc')

    const noDoc = suggestionSaveSchema.parse({
      cleanHtml: '<p>Inhalt</p>',
      workingDocJson: null,
      baseRevision: 2,
    })
    expect(noDoc.workingDocJson).toBeNull()
  })

  it('rejects empty clean HTML', () => {
    expect(() =>
      suggestionSaveSchema.parse({ cleanHtml: '', workingDocJson: null, baseRevision: 0 }),
    ).toThrow()
  })

  it('accepts optional title and summary metadata', () => {
    const parsed = suggestionSaveSchema.parse({
      cleanHtml: '<p>Inhalt</p>',
      workingDocJson: null,
      baseRevision: 0,
      title: 'Neuer Titel',
      summary: 'A'.repeat(50),
    })
    expect(parsed.title).toBe('Neuer Titel')
    expect(parsed.summary).toHaveLength(50)
  })
})

describe('moodVoteSchema', () => {
  it('only allows poll choices', () => {
    expect(moodVoteSchema.parse({ choice: 'approve' }).choice).toBe('approve')
    expect(moodVoteSchema.parse({ choice: 'undecided' }).choice).toBe('undecided')
    expect(() => moodVoteSchema.parse({ choice: 'maybe' })).toThrow()
  })
})

describe('ballotStartSchema', () => {
  it('accepts an empty body and an optional ballot length', () => {
    expect(ballotStartSchema.parse({})).toEqual({})
    expect(ballotStartSchema.parse({ ballotDays: 7 }).ballotDays).toBe(7)
  })

  it('rejects out-of-range or non-integer ballot lengths', () => {
    expect(() => ballotStartSchema.parse({ ballotDays: 0 })).toThrow()
    expect(() => ballotStartSchema.parse({ ballotDays: 31 })).toThrow()
    expect(() => ballotStartSchema.parse({ ballotDays: 2.5 })).toThrow()
  })
})

describe('ballotVoteSchema', () => {
  it('only allows definite ballot choices', () => {
    expect(ballotVoteSchema.parse({ choice: 'approve' }).choice).toBe('approve')
    expect(ballotVoteSchema.parse({ choice: 'reject' }).choice).toBe('reject')
    expect(ballotVoteSchema.parse({ choice: 'abstain' }).choice).toBe('abstain')
  })

  it('rejects "undecided" and unknown choices', () => {
    expect(() => ballotVoteSchema.parse({ choice: 'undecided' })).toThrow()
    expect(() => ballotVoteSchema.parse({ choice: 'maybe' })).toThrow()
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

  it('parses watched/archived/ballotPending/publishedOnly flags only when literally "true"', () => {
    expect(motionListQuerySchema.parse({ watched: 'true' }).watched).toBe(true)
    expect(motionListQuerySchema.parse({ archived: 'false' }).archived).toBe(false)
    expect(motionListQuerySchema.parse({ ballotPending: 'true' }).ballotPending).toBe(true)
    expect(motionListQuerySchema.parse({ publishedOnly: 'true' }).publishedOnly).toBe(true)
    expect(motionListQuerySchema.parse({}).watched).toBe(false)
    expect(motionListQuerySchema.parse({}).ballotPending).toBe(false)
    expect(motionListQuerySchema.parse({}).publishedOnly).toBe(false)
  })
})

describe('archiveSchema', () => {
  it('requires a boolean archived flag', () => {
    expect(archiveSchema.parse({ archived: true }).archived).toBe(true)
    expect(() => archiveSchema.parse({ archived: 'yes' })).toThrow()
  })
})

const uuid = '550e8400-e29b-41d4-a716-446655440000'

describe('postCreateSchema', () => {
  it('accepts a top-level post without a parent', () => {
    const parsed = postCreateSchema.parse({ bodyHtml: '<p>Hi</p>' })
    expect(parsed.parentId).toBeUndefined()
  })

  it('accepts an optional parentId for replies', () => {
    const parsed = postCreateSchema.parse({ bodyHtml: '<p>Hi</p>', parentId: uuid })
    expect(parsed.parentId).toBe(uuid)
  })

  it('rejects a non-uuid parentId and empty body', () => {
    expect(() => postCreateSchema.parse({ bodyHtml: '<p>x</p>', parentId: 'nope' })).toThrow()
    expect(() => postCreateSchema.parse({ bodyHtml: '' })).toThrow()
  })

  it('accepts inline references including a motion excerpt', () => {
    const parsed = postCreateSchema.parse({
      bodyHtml: '<p>Hi</p>',
      references: [
        { targetType: 'argument', targetId: uuid },
        { targetType: 'motion_excerpt', targetId: uuid, excerptText: 'Zitat', excerptVersion: 2 },
      ],
    })
    expect(parsed.references).toHaveLength(2)
  })

  it('rejects references with an unknown target type', () => {
    expect(() =>
      postCreateSchema.parse({
        bodyHtml: '<p>Hi</p>',
        references: [{ targetType: 'resourceX', targetId: uuid }],
      }),
    ).toThrow()
  })
})

describe('argumentCreateSchema', () => {
  it('accepts a pro/con argument with title and body', () => {
    const parsed = argumentCreateSchema.parse({
      stance: 'pro',
      title: 'Stärkt die Teilhabe',
      bodyHtml: '<p>Begründung</p>',
    })
    expect(parsed.stance).toBe('pro')
  })

  it('rejects an unknown stance or a too-short title', () => {
    expect(() =>
      argumentCreateSchema.parse({ stance: 'maybe', title: 'Gültiger Titel', bodyHtml: '<p>x</p>' }),
    ).toThrow()
    expect(() =>
      argumentCreateSchema.parse({ stance: 'pro', title: 'x', bodyHtml: '<p>x</p>' }),
    ).toThrow()
  })
})

describe('argumentUpdateSchema', () => {
  it('accepts a status or deliberation status update', () => {
    expect(argumentUpdateSchema.parse({ status: 'accepted' }).status).toBe('accepted')
    expect(
      argumentUpdateSchema.parse({ deliberationStatus: 'confirmed' }).deliberationStatus,
    ).toBe('confirmed')
  })

  it('rejects an empty update', () => {
    expect(() => argumentUpdateSchema.parse({})).toThrow()
  })
})

describe('questionCreateSchema', () => {
  it('accepts a valid question', () => {
    const parsed = questionCreateSchema.parse({
      title: 'Wie wird das finanziert?',
      bodyHtml: '<p>Details</p>',
    })
    expect(parsed.title).toContain('finanziert')
  })

  it('accepts a question without optional context', () => {
    const parsed = questionCreateSchema.parse({
      title: 'Wie wird das finanziert?',
    })
    expect(parsed.bodyHtml).toBe('')
  })

  it('rejects a too-short title', () => {
    expect(() => questionCreateSchema.parse({ title: 'kurz', bodyHtml: '<p>x</p>' })).toThrow()
  })
})

describe('answerCreateSchema', () => {
  it('requires a non-empty body', () => {
    expect(answerCreateSchema.parse({ bodyHtml: '<p>Antwort</p>' }).bodyHtml).toBeTruthy()
    expect(() => answerCreateSchema.parse({ bodyHtml: '' })).toThrow()
  })
})

describe('questionUpdateSchema', () => {
  it('accepts an answer id or null', () => {
    expect(questionUpdateSchema.parse({ acceptedAnswerId: uuid }).acceptedAnswerId).toBe(uuid)
    expect(questionUpdateSchema.parse({ acceptedAnswerId: null }).acceptedAnswerId).toBeNull()
  })

  it('rejects a non-uuid answer id', () => {
    expect(() => questionUpdateSchema.parse({ acceptedAnswerId: 'nope' })).toThrow()
  })
})

describe('resourceCreateSchema', () => {
  it('accepts an external link', () => {
    const parsed = resourceCreateSchema.parse({
      title: 'Quelle',
      kind: 'link',
      url: 'https://example.org/doc',
    })
    expect(parsed.kind).toBe('link')
  })

  it('accepts an uploaded file URL', () => {
    const parsed = resourceCreateSchema.parse({
      title: 'PDF',
      kind: 'file',
      url: '/uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
    })
    expect(parsed.url).toContain('/uploads/')
  })

  it('rejects a non-http link and a non-upload file URL', () => {
    expect(() =>
      resourceCreateSchema.parse({ title: 'Quelle', kind: 'link', url: 'ftp://x' }),
    ).toThrow()
    expect(() =>
      resourceCreateSchema.parse({ title: 'Datei', kind: 'file', url: 'https://evil/a.pdf' }),
    ).toThrow()
  })
})

describe('resourceUpdateSchema', () => {
  it('only allows accepted/rejected', () => {
    expect(resourceUpdateSchema.parse({ status: 'accepted' }).status).toBe('accepted')
    expect(() => resourceUpdateSchema.parse({ status: 'proposed' })).toThrow()
  })
})

describe('reportCreateSchema', () => {
  it('accepts a valid motion/post report', () => {
    const parsed = reportCreateSchema.parse({
      targetType: 'post',
      targetId: uuid,
      reason: 'Beleidigender Inhalt gegen ein Mitglied.',
    })
    expect(parsed.targetType).toBe('post')
  })

  it('rejects unknown target types and too-short reasons', () => {
    expect(() =>
      reportCreateSchema.parse({ targetType: 'user', targetId: uuid, reason: 'x'.repeat(20) }),
    ).toThrow()
    expect(() =>
      reportCreateSchema.parse({ targetType: 'motion', targetId: uuid, reason: 'kurz' }),
    ).toThrow()
  })
})

describe('reportResolveSchema', () => {
  it('requires an action and a mandatory note', () => {
    expect(
      reportResolveSchema.parse({ action: 'resolve', resolutionNote: 'Beitrag entfernt.' }).action,
    ).toBe('resolve')
    expect(() => reportResolveSchema.parse({ action: 'resolve', resolutionNote: '' })).toThrow()
    expect(() =>
      reportResolveSchema.parse({ action: 'delete', resolutionNote: 'egal' }),
    ).toThrow()
  })
})

describe('postModerationDeleteSchema', () => {
  it('requires a reason of at least 5 characters', () => {
    expect(postModerationDeleteSchema.parse({ reason: 'Spam-Beitrag' }).reason).toBe('Spam-Beitrag')
    expect(() => postModerationDeleteSchema.parse({ reason: 'x' })).toThrow()
  })
})

describe('userBanSchema', () => {
  it('requires a reason of at least 5 characters', () => {
    expect(userBanSchema.parse({ reason: 'Wiederholte Verstöße' }).reason).toBeTruthy()
    expect(() => userBanSchema.parse({ reason: '' })).toThrow()
  })
})

describe('upvoteToggleSchema', () => {
  it('accepts a valid target type and uuid', () => {
    const parsed = upvoteToggleSchema.parse({ targetType: 'argument', targetId: uuid })
    expect(parsed.targetType).toBe('argument')
    expect(parsed.targetId).toBe(uuid)
  })

  it('rejects unknown target types and non-uuid ids', () => {
    expect(() => upvoteToggleSchema.parse({ targetType: 'motion', targetId: uuid })).toThrow()
    expect(() => upvoteToggleSchema.parse({ targetType: 'post', targetId: 'nope' })).toThrow()
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
