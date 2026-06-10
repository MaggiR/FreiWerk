<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{ label?: string; disabled?: boolean }>(),
  { label: '', disabled: false },
)
</script>

<template>
  <label class="fw-switch" :class="{ 'is-on': model, 'is-disabled': disabled }">
    <input
      type="checkbox"
      role="switch"
      class="fw-switch__input"
      :checked="model"
      :disabled="disabled"
      @change="model = ($event.target as HTMLInputElement).checked"
    >
    <span class="fw-switch__track" aria-hidden="true">
      <span class="fw-switch__thumb" />
    </span>
    <span v-if="label || $slots.default" class="fw-switch__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.fw-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: var(--color-text);
}
.fw-switch.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.fw-switch__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.fw-switch__track {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  transition: background 0.2s ease, border-color 0.2s ease;
}
.fw-switch__thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transform: translateY(-50%);
  transition: transform 0.2s ease, background 0.2s ease;
}
.fw-switch.is-on .fw-switch__track {
  background: color-mix(in srgb, var(--color-accent) 22%, transparent);
  border-color: var(--color-accent);
}
.fw-switch.is-on .fw-switch__thumb {
  transform: translate(18px, -50%);
  background: var(--color-accent);
}
.fw-switch__input:focus-visible + .fw-switch__track {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.fw-switch__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
