import { createHash, randomBytes } from 'node:crypto'

// Raw tokens are 32 random bytes (256 bit) encoded as base64url. The raw token
// is only ever placed in the email link; the database stores its hash.
const TOKEN_BYTES = 32

/** Generate a new random magic-link token (URL-safe). */
export function generateMagicLinkToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * Hash a raw token for storage/lookup. Kept free of any database imports so it
 * can be unit-tested without a live connection.
 */
export function hashMagicLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
