export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, isModerator } = useAuthUser()
  if (!loggedIn.value) {
    return navigateTo({
      path: '/',
      query: { auth: 'login', redirect: to.fullPath },
    })
  }
  if (!isModerator.value) {
    return navigateTo('/')
  }
})
