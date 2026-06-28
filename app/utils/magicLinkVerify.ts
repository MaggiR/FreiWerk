export interface MagicLinkVerifyResponse {
  user: { needsOnboarding: boolean }
  needsOnboarding: boolean
  redirect: string | null
}

const inFlightByToken = new Map<string, Promise<MagicLinkVerifyResponse>>()

/** Redeem a magic-link token once; concurrent callers share the same request. */
export function redeemMagicLinkToken(token: string): Promise<MagicLinkVerifyResponse> {
  let pending = inFlightByToken.get(token)
  if (!pending) {
    pending = $fetch<MagicLinkVerifyResponse>('/api/auth/magic-link/verify', {
      method: 'POST',
      body: { token },
      credentials: 'include',
    }).finally(() => {
      inFlightByToken.delete(token)
    })
    inFlightByToken.set(token, pending)
  }
  return pending
}
