/**
 * Force first-time members through the initial profile setup. A logged-in user
 * whose account still needs onboarding is redirected to /willkommen until the
 * Stammdaten are saved.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value?.needsOnboarding) return
  if (to.path === '/willkommen') return

  return navigateTo({
    path: '/willkommen',
    query: { redirect: to.fullPath },
  })
})
