<script setup lang="ts">
const props = defineProps<{
  text: string
  query?: string
}>()

const parts = computed(() => highlightParts(props.text, props.query ?? ''))
</script>

<template>
  <span class="highlight-text">
    <template v-for="(part, index) in parts" :key="index">
      <mark v-if="part.highlight" class="highlight-text__mark">{{ part.text }}</mark>
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.highlight-text__mark {
  background: color-mix(in srgb, var(--color-primary) 45%, transparent);
  color: inherit;
  font-weight: inherit;
  padding: 0 0.1em;
  border-radius: 2px;
}
</style>
