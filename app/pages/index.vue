<script setup lang="ts">
const { loggedIn } = useAuthUser()

useHead({ title: 'FreiWerk — Marktplatz liberaler Ideen' })
</script>

<template>
  <MemberDashboard v-if="loggedIn" />
  <LandingPage v-else />
</template>
