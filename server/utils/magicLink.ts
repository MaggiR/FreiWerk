import { timingSafeEqual } from 'node:crypto'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { db } from '../database/client'
import { magicLinkTokens } from '../database/schema'
import {
  MAGIC_LINK_RESEND_COOLDOWN_SECONDS,
  MAGIC_LINK_TTL_MINUTES,
} from '../../shared/constants'
import { generateMagicLinkToken, hashMagicLinkToken } from './magicLinkToken'

export interface IssuedMagicLink {
  token: string
  expiresAt: Date
}

/**
 * Issue a fresh single-use magic-link token for an email address, unless one was
 * issued within the resend cooldown. Returns `null` when throttled so callers
 * can avoid sending another email without leaking that detail to the client.
 */
export async function issueMagicLinkToken(
  email: string,
  redirectPath: string | null,
): Promise<IssuedMagicLink | null> {
  const cooldownSince = new Date(
    Date.now() - MAGIC_LINK_RESEND_COOLDOWN_SECONDS * 1000,
  )

  const [recent] = await db
    .select({ id: magicLinkTokens.id })
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.email, email),
        isNull(magicLinkTokens.consumedAt),
        gt(magicLinkTokens.createdAt, cooldownSince),
      ),
    )
    .limit(1)

  if (recent) return null

  const token = generateMagicLinkToken()
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000)

  await db.insert(magicLinkTokens).values({
    email,
    tokenHash: hashMagicLinkToken(token),
    expiresAt,
    redirectPath,
  })

  return { token, expiresAt }
}

export interface ConsumedMagicLink {
  email: string
  redirectPath: string | null
}

/**
 * Validate and consume a raw magic-link token. Returns the associated email (and
 * optional redirect) on success, or `null` if the token is unknown, expired or
 * already used. Consumption is atomic via a conditional update.
 */
export async function consumeMagicLinkToken(
  token: string,
): Promise<ConsumedMagicLink | null> {
  const tokenHash = hashMagicLinkToken(token)
  const now = new Date()

  const [row] = await db
    .select({
      id: magicLinkTokens.id,
      email: magicLinkTokens.email,
      tokenHash: magicLinkTokens.tokenHash,
      expiresAt: magicLinkTokens.expiresAt,
      consumedAt: magicLinkTokens.consumedAt,
      redirectPath: magicLinkTokens.redirectPath,
    })
    .from(magicLinkTokens)
    .where(eq(magicLinkTokens.tokenHash, tokenHash))
    .limit(1)

  if (!row) return null

  // Defense in depth: constant-time compare even though we looked up by hash.
  const a = Buffer.from(row.tokenHash)
  const b = Buffer.from(tokenHash)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  if (row.consumedAt || row.expiresAt.getTime() <= now.getTime()) return null

  // Atomically mark consumed; if another request won the race, abort.
  const updated = await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(
      and(eq(magicLinkTokens.id, row.id), isNull(magicLinkTokens.consumedAt)),
    )
    .returning({ id: magicLinkTokens.id })

  if (updated.length === 0) return null

  return { email: row.email, redirectPath: row.redirectPath }
}

/** Best-effort cleanup of expired/old tokens (called opportunistically). */
export async function pruneExpiredMagicLinkTokens(): Promise<void> {
  await db
    .delete(magicLinkTokens)
    .where(lt(magicLinkTokens.expiresAt, new Date()))
}
