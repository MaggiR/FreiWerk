<script setup lang="ts">
const props = withDefaults(
  defineProps<{ topLabel?: string }>(),
  { topLabel: 'Zustimmung' },
)

const sortMode = defineModel<'top' | 'recent'>({ required: true })

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const options = computed(() => [
  { value: 'top' as const, label: props.topLabel, icon: 'thumbs-up' },
  { value: 'recent' as const, label: 'Aktuell', icon: 'clock' },
])

function onMenuClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

function select(value: 'top' | 'recent') {
  sortMode.value = value
  menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onMenuClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onMenuClickOutside, true))
</script>

<template>
  <div ref="menuRef" class="sort-menu" @click.stop>
    <button
      type="button"
      class="sort-menu__trigger"
      aria-label="Sortierung"
      :aria-expanded="menuOpen"
      @click.stop="menuOpen = !menuOpen"
    >
      <FontAwesomeIcon icon="ellipsis" />
    </button>
    <div v-if="menuOpen" class="sort-menu__panel" role="menu">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="sort-menu__item"
        role="menuitemradio"
        :aria-checked="sortMode === option.value"
        @click="select(option.value)"
      >
        <span class="sort-menu__check">
          <FontAwesomeIcon v-if="sortMode === option.value" icon="check" />
        </span>
        <FontAwesomeIcon :icon="option.icon" />
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sort-menu {
  position: relative;
  flex-shrink: 0;
}
.sort-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.sort-menu__trigger:hover {
  color: var(--color-text);
  border-color: color-mix(in srgb, var(--color-border) 60%, var(--color-text) 40%);
}
.sort-menu__panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 30;
  min-width: 11.5rem;
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.sort-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
}
.sort-menu__item:hover {
  background: var(--color-bg);
}
.sort-menu__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  color: var(--color-accent);
  font-size: 0.75rem;
}
</style>
