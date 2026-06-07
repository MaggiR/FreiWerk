interface FetchLikeError {
  data?: { statusMessage?: string; message?: string }
  statusMessage?: string
  message?: string
}

/**
 * Extract a user-facing error message from a $fetch/h3 error, with fallback.
 */
export function extractError(err: unknown, fallback: string): string {
  const e = err as FetchLikeError & { statusCode?: number }
  return (
    e?.data?.statusMessage ||
    e?.data?.message ||
    e?.statusMessage ||
    e?.message ||
    fallback
  )
}

export function isUnauthorized(err: unknown): boolean {
  const e = err as FetchLikeError & { statusCode?: number }
  return e?.statusCode === 401 || e?.data?.statusCode === 401
}
