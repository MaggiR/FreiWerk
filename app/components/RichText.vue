<script setup lang="ts">
// Renders already-sanitized HTML (server sanitizes on write). Safe to inject.
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="rich-text" v-html="html" />
</template>
