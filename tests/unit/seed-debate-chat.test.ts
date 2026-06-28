import { describe, it, expect } from 'vitest'
import { buildDeliberationBundle } from '../../server/database/seed-deliberation'
import {
  buildDebateChatBundle,
  extractDeliberationIds,
  resolveDebateChatPostCount,
} from '../../server/database/seed-debate-chat'

const now = new Date('2026-06-01T12:00:00.000Z')
const userIdByEmail = {
  'demo@freiwerk.local': 'user-demo',
  'admin@freiwerk.local': 'user-admin',
  'mod@freiwerk.local': 'user-mod',
  'anna.schneider@freiwerk.local': 'user-anna',
  'thomas.berger@freiwerk.local': 'user-thomas',
  'lisa.koch@freiwerk.local': 'user-lisa',
  'felix.weber@freiwerk.local': 'user-felix',
  'julia.hartmann@freiwerk.local': 'user-julia',
  'niklas.brandt@freiwerk.local': 'user-niklas',
  'sarah.mueller@freiwerk.local': 'user-sarah',
}

function buildBundle(status: 'debate' | 'ballot' | 'decided') {
  return buildDeliberationBundle({
    motionId: 'motion-1',
    motionTitle: 'Gründung in 24 Stunden',
    bodyHtml: '<p>Test body</p>',
    bodyDemand: 'Wir fordern ein digitales Gründungsverfahren.',
    bodyTheme: 'Unternehmensgründung',
    authorId: 'user-demo',
    status,
    publishedAt: new Date('2026-05-20T12:00:00.000Z'),
    deliberationLevel: 'rich',
    userIdByEmail,
    memberIds: Object.values(userIdByEmail),
    postIds: [],
    now,
  })
}

describe('resolveDebateChatPostCount', () => {
  it('scales with lifecycle status up to 20 messages', () => {
    const debate = resolveDebateChatPostCount({
      motionId: 'm',
      motionTitle: 'T',
      bodyTheme: 'Thema',
      bodyDemand: 'Forderung',
      status: 'debate',
      deliberationLevel: 'rich',
      authorId: 'a',
      userIdByEmail,
      memberIds: [],
      deliberation: { arguments: [], questions: [], answers: [], resources: [] },
      publishedAt: new Date('2026-05-28T12:00:00.000Z'),
      now,
    })
    const decided = resolveDebateChatPostCount({
      motionId: 'm',
      motionTitle: 'T',
      bodyTheme: 'Thema',
      bodyDemand: 'Forderung',
      status: 'decided',
      deliberationLevel: 'rich',
      authorId: 'a',
      userIdByEmail,
      memberIds: [],
      deliberation: { arguments: [], questions: [], answers: [], resources: [] },
      publishedAt: null,
      now,
    })
    expect(debate).toBeGreaterThanOrEqual(4)
    expect(debate).toBeLessThanOrEqual(20)
    expect(decided).toBeGreaterThan(debate)
    expect(decided).toBeLessThanOrEqual(20)
  })
})

describe('buildDebateChatBundle', () => {
  it('creates threaded, formatted posts with diverse references', () => {
    const deliberationBundle = buildBundle('debate')
    const deliberation = extractDeliberationIds(deliberationBundle)
    const chat = buildDebateChatBundle({
      motionId: 'motion-1',
      motionTitle: 'Gründung in 24 Stunden',
      bodyTheme: 'Unternehmensgründung',
      bodyDemand: 'Wir fordern ein digitales Gründungsverfahren.',
      status: 'decided',
      deliberationLevel: 'rich',
      authorId: 'user-demo',
      userIdByEmail,
      memberIds: Object.values(userIdByEmail),
      deliberation,
      publishedAt: new Date('2026-05-01T12:00:00.000Z'),
      now,
    })

    expect(chat.posts.length).toBeGreaterThanOrEqual(12)
    expect(chat.posts.length).toBeLessThanOrEqual(20)
    expect(chat.posts.some((p) => p.parentId != null)).toBe(true)
    expect(chat.posts.some((p) => p.bodyHtml.includes('<strong>'))).toBe(true)
    expect(chat.posts.some((p) => p.bodyHtml.includes('<ul>') || p.bodyHtml.includes('<ol>'))).toBe(
      true,
    )

    const refTypes = new Set(chat.references.map((r) => r.targetType))
    expect(refTypes.has('argument')).toBe(true)
    expect(chat.references.some((r) => r.excerptText && r.targetType === 'post')).toBe(true)
    expect(chat.references.some((r) => r.targetType === 'motion_excerpt')).toBe(true)
  })

  it('returns no posts when deliberation level is none', () => {
    const chat = buildDebateChatBundle({
      motionId: 'motion-2',
      motionTitle: 'Leer',
      bodyTheme: 'Thema',
      bodyDemand: 'Forderung',
      status: 'debate',
      deliberationLevel: 'none',
      authorId: 'user-demo',
      userIdByEmail,
      memberIds: Object.values(userIdByEmail),
      deliberation: { arguments: [], questions: [], answers: [], resources: [] },
      publishedAt: null,
      now,
    })
    expect(chat.posts).toHaveLength(0)
  })
})
