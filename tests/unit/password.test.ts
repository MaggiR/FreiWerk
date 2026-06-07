import { describe, it, expect } from 'vitest'
import { hashUserPassword, verifyUserPassword } from '../../server/utils/password'

describe('password hashing', () => {
  it('produces a verifiable scrypt hash', async () => {
    const hash = await hashUserPassword('password123')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyUserPassword(hash, 'password123')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashUserPassword('password123')
    expect(await verifyUserPassword(hash, 'wrong-password')).toBe(false)
  })

  it('returns false for malformed stored hashes', async () => {
    expect(await verifyUserPassword('not-a-hash', 'x')).toBe(false)
    expect(await verifyUserPassword('scrypt$only', 'x')).toBe(false)
  })

  it('produces unique hashes for the same password (random salt)', async () => {
    const a = await hashUserPassword('same')
    const b = await hashUserPassword('same')
    expect(a).not.toBe(b)
  })
})
