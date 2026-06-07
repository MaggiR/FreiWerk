import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

// End-to-end test against a running Nuxt build + database.
// Skipped unless RUN_E2E=1 (requires DATABASE_URL and a seeded DB), so the
// default `npm run check` stays fast and DB-independent.
const runE2E = process.env.RUN_E2E === '1'

describe.skipIf(!runE2E)('motions API (e2e)', async () => {
  await setup({ server: true, browser: false })

  it('lists published motions and excludes drafts for anonymous users', async () => {
    const res = await $fetch<{ motions: Array<{ status: string }> }>('/api/motions')
    expect(Array.isArray(res.motions)).toBe(true)
    expect(res.motions.every((m) => m.status !== 'draft')).toBe(true)
  })

  it('exposes seeded divisions', async () => {
    const res = await $fetch<{ divisions: unknown[] }>('/api/divisions')
    expect(res.divisions.length).toBeGreaterThan(0)
  })
})
