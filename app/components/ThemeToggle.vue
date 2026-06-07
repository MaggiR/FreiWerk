<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="isDark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'"
    :title="isDark ? 'Heller Modus' : 'Dunkler Modus'"
    @click="toggle"
  >
    <ClientOnly>
      <FontAwesomeIcon :icon="isDark ? 'sun' : 'moon'" />
      <template #fallback>
        <FontAwesomeIcon icon="circle-half-stroke" />
      </template>
    </ClientOnly>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.12s ease;
}
.theme-toggle:hover {
  transform: translateY(-1px);
  background: var(--color-bg);
}
</style>
