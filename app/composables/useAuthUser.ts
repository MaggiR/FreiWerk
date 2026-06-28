import { computed } from 'vue'
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

  async function syncSessionAfterAuthMutation() {
    await refreshSession()
    if (loggedIn.value) return
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    await refreshSession()
  }

  /**
   * Start a passwordless login. Returns whether the user was logged in directly
   * (demo account) or a magic-link email was dispatched.
   */
  async function requestMagicLink(
    email: string,
    redirect?: string | null,
  ): Promise<MagicLinkRequestResult> {
    const result = await $fetch<MagicLinkRequestResult>(
      '/api/auth/magic-link/request',
      {
        method: 'POST',
        body: { email, ...(redirect ? { redirect } : {}) },
        credentials: 'include',
      },
    )
    if (result.mode === 'demo') {
      await syncSessionAfterAuthMutation()
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
    handleAuthError,
    SESSION_EXPIRED_MESSAGE,
  }
}
