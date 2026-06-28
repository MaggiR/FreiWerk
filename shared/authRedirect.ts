/**
 * Normalize post-login redirect targets. Strips login-modal query noise so a
 * redeemed magic link does not land on `/?auth=login` and reopen the dialog.
 */
export function sanitizeAuthRedirectPath(
  input: string | null | undefined,
): string | null {
  if (input == null) return null

  const trimmed = input.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null

  const queryIndex = trimmed.indexOf('?')
  if (queryIndex === -1) return trimmed

  const pathname = trimmed.slice(0, queryIndex)
  const params = new URLSearchParams(trimmed.slice(queryIndex + 1))
  const auth = params.get('auth')

  if (auth === 'login' || auth === 'register') {
    const nested = params.get('redirect')
    if (nested) {
      const nestedSanitized = sanitizeAuthRedirectPath(nested)
      if (nestedSanitized) return nestedSanitized
    }
  }

  params.delete('auth')
  params.delete('redirect')
  const nextQuery = params.toString()
  return nextQuery ? `${pathname}?${nextQuery}` : pathname
}
