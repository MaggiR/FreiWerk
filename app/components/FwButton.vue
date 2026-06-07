<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    block: false,
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="fw-btn"
    :class="[`fw-btn--${variant}`, { 'fw-btn--block': block }]"
  >
    <slot />
  </button>
</template>

<style scoped>
.fw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.2s ease,
    opacity 0.2s ease;
}
.fw-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.fw-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.fw-btn--block {
  width: 100%;
}
.fw-btn--primary {
  background: var(--brand-yellow);
  color: #1a1a00;
}
.fw-btn--secondary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.fw-btn--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}
.fw-btn--ghost:hover:not(:disabled) {
  background: var(--color-bg);
}
.fw-btn--danger {
  background: var(--color-danger);
  color: #fff;
}
</style>
