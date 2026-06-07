import { describe, it, expect } from 'vitest'
import { hasRequiredRole } from '../../server/utils/auth'

describe('hasRequiredRole', () => {
  it('grants access when role meets the minimum', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true)
    expect(hasRequiredRole('admin', 'moderator')).toBe(true)
    expect(hasRequiredRole('moderator', 'member')).toBe(true)
    expect(hasRequiredRole('member', 'member')).toBe(true)
  })

  it('denies access when role is insufficient', () => {
    expect(hasRequiredRole('member', 'moderator')).toBe(false)
    expect(hasRequiredRole('member', 'admin')).toBe(false)
    expect(hasRequiredRole('moderator', 'admin')).toBe(false)
  })
})
