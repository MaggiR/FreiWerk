import { describe, it, expect } from 'vitest'
import { sanitizeAuthRedirectPath } from '../../shared/authRedirect'

describe('sanitizeAuthRedirectPath', () => {
  it('returns plain internal paths unchanged', () => {
    expect(sanitizeAuthRedirectPath('/motions')).toBe('/motions')
    expect(sanitizeAuthRedirectPath('/motions?status=debate')).toBe('/motions?status=debate')
  })

  it('unwraps nested redirect targets from login-modal URLs', () => {
    expect(sanitizeAuthRedirectPath('/?auth=login&redirect=%2Fmotions')).toBe('/motions')
    expect(sanitizeAuthRedirectPath('/?auth=register&redirect=/willkommen')).toBe('/willkommen')
  })

  it('strips auth query params without a nested redirect', () => {
    expect(sanitizeAuthRedirectPath('/?auth=login')).toBe('/')
  })

  it('rejects external and empty values', () => {
    expect(sanitizeAuthRedirectPath('https://evil.example')).toBeNull()
    expect(sanitizeAuthRedirectPath('//evil.example')).toBeNull()
    expect(sanitizeAuthRedirectPath('')).toBeNull()
    expect(sanitizeAuthRedirectPath(null)).toBeNull()
  })
})
