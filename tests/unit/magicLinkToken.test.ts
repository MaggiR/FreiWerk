import { describe, it, expect } from 'vitest'
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
} from '../../server/utils/magicLinkToken'

describe('generateMagicLinkToken', () => {
  it('produces a long, URL-safe, unique token', () => {
    const a = generateMagicLinkToken()
    const b = generateMagicLinkToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    // base64url alphabet only (no +, /, =).
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('hashMagicLinkToken', () => {
  it('is deterministic and returns a 64-char hex SHA-256 digest', () => {
    const token = 'example-token'
    const hash = hashMagicLinkToken(token)
    expect(hash).toBe(hashMagicLinkToken(token))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different tokens and never echoes the raw token', () => {
    const token = generateMagicLinkToken()
    const hash = hashMagicLinkToken(token)
    expect(hash).not.toBe(hashMagicLinkToken(`${token}x`))
    expect(hash).not.toContain(token)
  })
})
