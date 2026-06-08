import { computed } from 'vue'
import { isUnauthorized } from '~/utils/error'

export const SESSION_EXPIRED_MESSAGE = 'Sitzung abgelaufen. Bitte erneut anmelden.'

interface Credentials {
  email: string
  password: string
}

interface RegisterInput extends Credentials {
  displayName: string
}

/**
 * Thin wrapper around nuxt-auth-utils `useUserSession` with auth actions.
 */
export function useAuthUser() {
  const { loggedIn, user, fetch: refreshSession, clear } = useUserSession()

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isModerator = computed(
    () => user.value?.role === 'moderator' || user.value?.role === 'admin',
  )

  async function login(credentials: Credentials) {
    await $fetch('/api/auth/login', { method: 'POST', body: credentials })
    await refreshSession()
  }

  async function register(input: RegisterInput) {
    await $fetch('/api/auth/register', { method: 'POST', body: input })
    await refreshSession()
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
    login,
    register,
    logout,
    refreshSession,
    handleAuthError,
    SESSION_EXPIRED_MESSAGE,
  }
}
