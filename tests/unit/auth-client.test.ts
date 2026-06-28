import { describe, it, expect } from 'vitest'
import { isAuthMutationUrl } from '../../app/utils/auth'

describe('isAuthMutationUrl', () => {
  it('matches the passwordless magic-link endpoints', () => {
    expect(isAuthMutationUrl('/api/auth/magic-link/request')).toBe(true)
    expect(isAuthMutationUrl('/api/auth/magic-link/verify')).toBe(true)
  })

  it('does not match other API routes', () => {
    expect(isAuthMutationUrl('/api/motions/abc/posts')).toBe(false)
    expect(isAuthMutationUrl('/api/_auth/session')).toBe(false)
    expect(isAuthMutationUrl('/api/auth/logout')).toBe(false)
  })
})
