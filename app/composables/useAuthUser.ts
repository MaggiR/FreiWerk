import { computed } from 'vue'
import { sanitizeAuthRedirectPath } from '#shared/authRedirect'
import { isUnauthorized } from '~/utils/error'

export const SESSION_EXPIRED_MESSAGE = 'Sitzung abgelaufen. Bitte erneut anmelden.'

export interface MagicLinkRequestResult {
  /** 'demo' = logged in immediately; 'magic-link' = email with link sent. */
  mode: 'demo' | 'magic-link'
  loggedIn?: boolean
  sent?: boolean
}

/**
 * Thin wrapper around nuxt-auth-utils `useUserSession` with passwordless auth.
 */
export function useAuthUser() {
  const { loggedIn, user, fetch: refreshSession, clear } = useUserSession()

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isModerator = computed(
    () => user.value?.role === 'moderator' || user.value?.role === 'admin',
  )
  const needsOnboarding = computed(() => user.value?.needsOnboarding === true)

  async function ensureLoggedInSession() {
    for (let attempt = 0; attempt < 8; attempt++) {
      await refreshSession()
      if (loggedIn.value) return
      if (!import.meta.client) return
      await new Promise<void>((resolve) => {
        if (attempt === 0) {
          requestAnimationFrame(() => resolve())
          return
        }
        window.setTimeout(resolve, 40 * attempt)
      })
    }
  }

  /**
   * Start a passwordless login. Returns whether the user was logged in directly
   * (demo account) or a magic-link email was dispatched.
   */
  async function requestMagicLink(
    email: string,
    redirect?: string | null,
  ): Promise<MagicLinkRequestResult> {
    const safeRedirect = sanitizeAuthRedirectPath(redirect ?? null)
    const result = await $fetch<MagicLinkRequestResult>(
      '/api/auth/magic-link/request',
      {
        method: 'POST',
        body: { email, ...(safeRedirect ? { redirect: safeRedirect } : {}) },
        credentials: 'include',
      },
    )
    if (result.mode === 'demo') {
      await ensureLoggedInSession()
      if (!loggedIn.value) {
        throw new Error(
          'Anmeldung konnte nicht abgeschlossen werden. Bitte Cookies und Seiten-URL prüfen.',
        )
      }
    }
    return result
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/')
  }

  /** Clear stale client session after a 401 from a protected endpoint. */
  async function handleAuthError(err: unknown): Promise<boolean> {
    if (!isUnauthorized(err) || !loggedIn.value) return false
    await clear()
    return true
  }

  return {
    loggedIn,
    user,
    isAdmin,
    isModerator,
    needsOnboarding,
    requestMagicLink,
    logout,
    refreshSession,
    ensureLoggedInSession,
    handleAuthError,
    SESSION_EXPIRED_MESSAGE,
  }
}
