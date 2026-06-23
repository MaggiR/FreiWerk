<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = route.params.id as string
</script>

<template>
  <MotionDraftEditor :motion-id="id" />
</template>
