import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const KEYLEN = 64
const SALT_BYTES = 16

/**
 * Hash a plaintext password using scrypt. Result format: `scrypt$<salt>$<hash>`.
 * Used by both the auth endpoints and the standalone seed script, so it must
 * not depend on the Nuxt runtime.
 */
export async function hashUserPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

/**
 * Verify a plaintext password against a stored `scrypt$<salt>$<hash>` value.
 * Constant-time comparison; returns false on any malformed input.
 */
export async function verifyUserPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }
  const salt = parts[1]
  const expectedHex = parts[2]
  if (!salt || !expectedHex) {
    return false
  }
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== derived.length) {
    return false
  }
  return timingSafeEqual(derived, expected)
}
