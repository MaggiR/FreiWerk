<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="fw-badge" :class="`fw-badge--${tone}`">
    <slot />
  </span>
</template>

<style scoped>
.fw-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.2rem var(--space-3);
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.fw-badge--primary {
  background: rgba(255, 224, 0, 0.18);
  color: #8a7800;
  border-color: rgba(255, 224, 0, 0.5);
}
.fw-badge--secondary {
  background: rgba(3, 45, 103, 0.12);
  color: var(--brand-blue);
  border-color: rgba(3, 45, 103, 0.3);
}
.fw-badge--tertiary {
  background: rgba(0, 167, 231, 0.15);
  color: #0277a3;
  border-color: rgba(0, 167, 231, 0.4);
}
.fw-badge--success {
  background: rgba(30, 142, 90, 0.15);
  color: var(--color-success);
  border-color: rgba(30, 142, 90, 0.4);
}
.dark .fw-badge--primary {
  color: var(--brand-yellow);
}
.dark .fw-badge--secondary {
  color: #9db8e8;
}
.dark .fw-badge--tertiary {
  color: var(--brand-cyan);
}
</style>
