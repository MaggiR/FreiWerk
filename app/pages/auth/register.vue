<script setup lang="ts">
const { loggedIn } = useAuthUser()

if (loggedIn.value) {
  await navigateTo('/')
} else {
  await navigateTo({ path: '/', query: { auth: 'register' }, replace: true })
}
</script>

<template>
  <div />
</template>
