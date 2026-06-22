import { describe, it, expect } from 'vitest'
import { buildMotionBody, assertMotionBodyLength } from '../../server/database/seed-data'

describe('seed motion bodies', () => {
  it('generates at least 500 words per standard motion', () => {
    const html = buildMotionBody('Testthema', 'Wir fordern eine konkrete Testmaßnahme mit messbarer Wirkung.')
    expect(() => assertMotionBodyLength(html, 'Test', 'standard')).not.toThrow()
  })

  it('supports compact and rich body styles', () => {
    const compact = buildMotionBody('Test', 'Wir fordern X.', 'compact')
    const rich = buildMotionBody('Test', 'Wir fordern X.', 'rich')
    expect(() => assertMotionBodyLength(compact, 'Compact', 'compact')).not.toThrow()
    expect(() => assertMotionBodyLength(rich, 'Rich', 'rich')).not.toThrow()
    expect(compact).toContain('<ul>')
    expect(rich).toContain('<ol>')
  })
})
