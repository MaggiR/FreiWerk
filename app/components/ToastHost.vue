<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const icons: Record<ToastType, string> = {
  success: 'check',
  error: 'triangle-exclamation',
  info: 'circle-question',
}
</script>

<template>
  <ClientOnly>
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="status"
        >
          <FontAwesomeIcon :icon="icons[toast.type]" class="toast__icon" aria-hidden="true" />
          <span class="toast__msg">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close"
            aria-label="Benachrichtigung schließen"
            @click="dismiss(toast.id)"
          >
            <FontAwesomeIcon icon="xmark" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </ClientOnly>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: calc(var(--header-total-height) + var(--space-4));
  right: var(--space-4);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(360px, calc(100vw - 2 * var(--space-4)));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  color: var(--color-text);
}

.toast--success {
  border-left-color: #0a9f5e;
}
.toast--error {
  border-left-color: #d91e36;
}
.toast--info {
  border-left-color: var(--color-accent);
}

.toast__icon {
  margin-top: 0.15rem;
  flex-shrink: 0;
}
.toast--success .toast__icon {
  color: #0a9f5e;
}
.toast--error .toast__icon {
  color: #d91e36;
}
.toast--info .toast__icon {
  color: var(--color-accent);
}

.toast__msg {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.4;
}

.toast__close {
  flex-shrink: 0;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.toast__close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.toast-leave-active {
  position: absolute;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
