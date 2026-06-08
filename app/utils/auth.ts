/** Auth endpoints that may legitimately return 401 without a stale session. */
export function isAuthMutationUrl(request: RequestInfo): boolean {
  const url = typeof request === 'string' ? request : request.url
  return url.includes('/api/auth/login') || url.includes('/api/auth/register')
}
