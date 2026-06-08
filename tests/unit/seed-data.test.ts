import { describe, it, expect } from 'vitest'
import { buildMotionBody, assertMotionBodyLength } from '../../server/database/seed-data'

describe('seed motion bodies', () => {
  it('generates at least 500 words per motion', () => {
    const html = buildMotionBody('Testthema', 'Wir fordern eine konkrete Testmaßnahme mit messbarer Wirkung.')
    expect(() => assertMotionBodyLength(html, 'Test')).not.toThrow()
  })
})
