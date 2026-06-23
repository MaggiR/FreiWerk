import { describe, it, expect } from 'vitest'
import {
  buildMotionBody,
  assertMotionBodyLength,
  SEED_MOTIONS,
} from '../../server/database/seed-data'

describe('seed motion bodies', () => {
  it('generates compact fallback bodies', () => {
    const html = buildMotionBody('Testthema', 'Wir fordern eine konkrete Testmaßnahme.', 'compact')
    expect(() => assertMotionBodyLength(html, 'Test', 'compact')).not.toThrow()
    expect(html).toContain('<ul>')
  })

  it('supports rich body style', () => {
    const rich = buildMotionBody('Test', 'Wir fordern X.', 'rich')
    expect(() => assertMotionBodyLength(rich, 'Rich', 'rich')).not.toThrow()
    expect(rich).toContain('<ol>')
  })

  it('defines 22 demo motions across lifecycle stages', () => {
    expect(SEED_MOTIONS).toHaveLength(22)
    const statuses = SEED_MOTIONS.map((m) => m.status)
    expect(statuses.filter((s) => s === 'draft').length).toBeGreaterThanOrEqual(2)
    expect(statuses.filter((s) => s === 'debate').length).toBeGreaterThanOrEqual(10)
    expect(statuses.filter((s) => s === 'ballot').length).toBeGreaterThanOrEqual(2)
    expect(statuses.filter((s) => s === 'decided').length).toBeGreaterThanOrEqual(3)
  })

  it('uses diverse custom HTML for demo motions', () => {
    const withLink = SEED_MOTIONS.find((m) => m.title === 'Gründung in 24 Stunden')
    expect(withLink?.bodyHtml).toContain('<a href=')
    expect(withLink?.bodyHtml).toContain('attachment-chip')
    expect(() =>
      assertMotionBodyLength(withLink!.bodyHtml!, withLink!.title, 'custom'),
    ).not.toThrow()
  })
})
