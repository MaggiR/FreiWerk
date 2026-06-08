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

    onNuxtReady(async () => {
      await refreshSession()
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void refreshSession()
      }
    })

    globalThis.$fetch = $fetch.create({
      async onResponseError({ response, request }) {
        if (response.status !== 401 || !loggedIn.value || isAuthMutationUrl(request)) {
          return
        }
        await clear()
        openAuthModal('login')
      },
    })
  },
})
