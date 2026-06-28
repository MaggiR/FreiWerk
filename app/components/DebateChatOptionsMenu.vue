<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Glass trigger over chat scroll area (default) vs compact header control. */
    variant?: 'overlay' | 'header'
    verticalIcon?: boolean
  }>(),
  { variant: 'overlay', verticalIcon: false },
)

const postSort = defineModel<'recent' | 'oldest'>('postSort', { required: true })
const showThreads = defineModel<boolean>('showThreads', { default: true })

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function onMenuClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

function setPostSort(value: 'recent' | 'oldest') {
  postSort.value = value
  menuOpen.value = false
}

function toggleShowThreads() {
  showThreads.value = !showThreads.value
  menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onMenuClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onMenuClickOutside, true))
</script>

<template>
  <div
    ref="menuRef"
    class="debate-chat-menu"
    :class="`debate-chat-menu--${variant}`"
    @click.stop
  >
    <button
      type="button"
      class="debate-chat-menu__trigger"
      aria-label="Chat-Optionen"
      :aria-expanded="menuOpen"
      @click.stop="menuOpen = !menuOpen"
    >
      <FontAwesomeIcon :icon="verticalIcon ? 'ellipsis-vertical' : 'ellipsis'" />
    </button>
    <div v-if="menuOpen" class="debate-chat-menu__panel" role="menu">
      <button
        type="button"
        class="debate-chat-menu__item"
        role="menuitemradio"
        :aria-checked="postSort === 'oldest'"
        @click="setPostSort('oldest')"
      >
        <span class="debate-chat-menu__check">
          <FontAwesomeIcon v-if="postSort === 'oldest'" icon="check" />
        </span>
        Älteste zuerst
      </button>
      <button
        type="button"
        class="debate-chat-menu__item"
        role="menuitemradio"
        :aria-checked="postSort === 'recent'"
        @click="setPostSort('recent')"
      >
        <span class="debate-chat-menu__check">
          <FontAwesomeIcon v-if="postSort === 'recent'" icon="check" />
        </span>
        Neueste zuerst
      </button>
      <button
        type="button"
        class="debate-chat-menu__item"
        role="menuitemcheckbox"
        :aria-checked="showThreads"
        @click="toggleShowThreads"
      >
        <span class="debate-chat-menu__check">
          <FontAwesomeIcon v-if="showThreads" icon="check" />
        </span>
        Bezüge anzeigen
      </button>
    </div>
  </div>
</template>

<style scoped>
.debate-chat-menu {
  position: relative;
  flex-shrink: 0;
}
.debate-chat-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.debate-chat-menu--overlay .debate-chat-menu__trigger {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-sm);
}
.debate-chat-menu--overlay .debate-chat-menu__trigger:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--glass-bg) 80%, var(--color-surface) 20%);
}
.debate-chat-menu--header .debate-chat-menu__trigger {
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  font-size: 1rem;
}
.debate-chat-menu--header .debate-chat-menu__trigger:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
}
.debate-chat-menu__panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 30;
  min-width: 11rem;
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.debate-chat-menu__item {
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
.debate-chat-menu__item:hover {
  background: var(--color-bg);
}
.debate-chat-menu__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  color: var(--color-accent);
}
</style>
