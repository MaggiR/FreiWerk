<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  reference: []
  file: []
}>()

function onReference() {
  emit('reference')
}

function onFile() {
  emit('file')
}
</script>

<template>
  <div
    class="attach-menu"
    :class="{ 'attach-menu--disabled': disabled }"
  >
    <button
      type="button"
      class="attach-menu__trigger"
      aria-label="Anhang hinzufügen"
      title="Anhang hinzufügen"
      :disabled="disabled"
    >
      <FontAwesomeIcon icon="paperclip" />
    </button>
    <div class="attach-menu__panel" role="menu">
      <button
        type="button"
        class="attach-menu__item"
        role="menuitem"
        @click="onReference"
      >
        <FontAwesomeIcon class="attach-menu__item-icon" icon="link" />
        Referenz
      </button>
      <button
        type="button"
        class="attach-menu__item"
        role="menuitem"
        @click="onFile"
      >
        <FontAwesomeIcon class="attach-menu__item-icon" icon="file-lines" />
        Datei
      </button>
    </div>
  </div>
</template>

<style scoped>
.attach-menu {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 0.1rem;
}
.attach-menu--disabled {
  opacity: 0.35;
  pointer-events: none;
}
.attach-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.attach-menu__trigger:hover,
.attach-menu:focus-within .attach-menu__trigger {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}
.attach-menu__panel {
  position: absolute;
  bottom: calc(100% + var(--space-1));
  left: 0;
  z-index: 5;
  min-width: 9rem;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease,
    transform 0.15s ease;
}
.attach-menu:hover .attach-menu__panel,
.attach-menu:focus-within .attach-menu__panel {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.attach-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font: inherit;
  font-size: 0.88rem;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}
.attach-menu__item:hover {
  background: var(--color-bg);
}
.attach-menu__item-icon {
  flex-shrink: 0;
  width: 1rem;
  color: var(--color-text-muted);
}
</style>
