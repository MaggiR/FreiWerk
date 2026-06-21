<script setup lang="ts">
defineProps<{
  label: string
  icon: string
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="tab-view-head-btn" @click="emit('click')">
    <FontAwesomeIcon :icon="icon" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.tab-view-head-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  max-width: 100%;
  padding: 0.35rem var(--space-3);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.tab-view-head-btn:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.tab-view-head-btn svg {
  flex-shrink: 0;
  font-size: 0.78rem;
}
</style>
