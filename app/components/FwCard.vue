<script setup lang="ts">
withDefaults(defineProps<{ glass?: boolean; pad?: boolean }>(), {
  glass: false,
  pad: true,
})
</script>

<template>
  <div class="fw-card" :class="{ 'fw-card--glass': glass, 'fw-card--pad': pad }">
    <slot />
  </div>
</template>

<style scoped>
.fw-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.fw-card--pad {
  padding: var(--space-5);
}
.fw-card--glass {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
</style>
