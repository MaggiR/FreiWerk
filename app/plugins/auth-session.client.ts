import { isAuthMutationUrl } from '~/utils/auth'

/**
 * Keep client session state in sync with the sealed cookie and clear stale UI
 * state when protected API calls are rejected with 401.
 */
export default defineNuxtPlugin({
  name: 'freiwerk-auth-session',
  enforce: 'post',
  setup() {
    const { clear, loggedIn, fetch: refreshSession } = useUserSession()
    const { open: openAuthModal } = useAuthModal()

    let lastSessionRefresh = 0
    const SESSION_REFRESH_MIN_MS = 5 * 60 * 1000

    onNuxtReady(async () => {
      await refreshSession()
      lastSessionRefresh = Date.now()
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastSessionRefresh < SESSION_REFRESH_MIN_MS) return
      lastSessionRefresh = now
      void refreshSession()
    })

    globalThis.$fetch = $fetch.create({
      async onResponseError({ response, request }) {
        if (response.status !== 401 || !loggedIn.value || isAuthMutationUrl(request)) {
          return
        }
        await clear()
        openAuthModal('login', useRouter().currentRoute.value.fullPath)
      },
    })
  },
})
