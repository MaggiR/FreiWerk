<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useAuthUser()

if (loggedIn.value) {
  await navigateTo('/')
} else {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
  await navigateTo({
    path: '/',
    query: { auth: 'login', ...(redirect ? { redirect } : {}) },
    replace: true,
  })
}
</script>

<template>
  <div />
</template>
