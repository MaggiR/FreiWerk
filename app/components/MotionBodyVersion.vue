<script setup lang="ts">
defineProps<{
  version: number
  updatedAt: string | Date
}>()
</script>

<template>
  <p class="motion-body-version app-hint">
    <template v-if="version > 0">Version {{ version }} · </template>
    Zuletzt geändert <RelativeTime :value="updatedAt" />
  </p>
</template>

<style scoped>
.motion-body-version {
  margin: 0;
  font-size: 0.78rem;
}
</style>
