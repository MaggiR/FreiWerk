import { computed } from 'vue'

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

  return {
    loggedIn,
    user,
    isAdmin,
    isModerator,
    login,
    register,
    logout,
    refreshSession,
  }
}
