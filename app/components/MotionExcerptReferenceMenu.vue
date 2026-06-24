<script setup lang="ts">
import { buildMotionExcerptReference } from '~/utils/references'
import { getSelectionExcerptIn } from '~/utils/chatQuote'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionVersion?: number | null
    enabled?: boolean
  }>(),
  {
    motionVersion: null,
    enabled: true,
  },
)

const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const { queueReference } = useComposerReferenceQueue()
const toast = useToast()

const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const pendingExcerpt = ref<string | null>(null)

function closeMenu() {
  menuOpen.value = false
  pendingExcerpt.value = null
}

function updateMenuFromSelection() {
  const root = rootRef.value
  if (!root || !props.enabled) {
    closeMenu()
    return
  }

  const excerpt = getSelectionExcerptIn(root)
  if (!excerpt) {
    closeMenu()
    return
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    closeMenu()
    return
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  pendingExcerpt.value = excerpt
  menuX.value = rect.left + rect.width / 2
  menuY.value = rect.bottom + 8
  menuOpen.value = true
}

function onMouseUp() {
  if (!props.enabled) return
  nextTick(updateMenuFromSelection)
}

function onSelectionChange() {
  if (!menuOpen.value) return
  nextTick(updateMenuFromSelection)
}

function onReferenz() {
  const excerpt = pendingExcerpt.value
  if (!excerpt) return

  if (!loggedIn.value) {
    openAuthModal('login')
    closeMenu()
    window.getSelection()?.removeAllRanges()
    return
  }

  queueReference(
    buildMotionExcerptReference(props.motionId, excerpt, props.motionVersion),
    { focusDebate: true },
  )
  window.getSelection()?.removeAllRanges()
  closeMenu()
  toast.success('Referenz zum Entwurf hinzugefügt.')
}

function onClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if (menuRef.value?.contains(target)) return
  closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (menuOpen.value && event.key === 'Escape') {
    closeMenu()
  }
}

watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) closeMenu()
  },
)

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="motion-excerpt-ref" @mouseup="onMouseUp">
    <slot />
  </div>

  <Teleport to="body">
    <Transition name="motion-excerpt-menu">
      <div
        v-if="menuOpen && pendingExcerpt"
        ref="menuRef"
        class="motion-excerpt-menu"
        role="menu"
        :style="{ left: `${menuX}px`, top: `${menuY}px` }"
        @mousedown.prevent
      >
        <button
          type="button"
          class="motion-excerpt-menu__item"
          role="menuitem"
          @click="onReferenz"
        >
          <FontAwesomeIcon class="motion-excerpt-menu__icon" icon="link" />
          Referenz
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.motion-excerpt-ref {
  display: contents;
}

.motion-excerpt-menu {
  position: fixed;
  z-index: 1000;
  transform: translateX(-50%);
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.motion-excerpt-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 0.88rem;
  white-space: nowrap;
  cursor: pointer;
}
.motion-excerpt-menu__item:hover {
  background: var(--color-bg);
}
.motion-excerpt-menu__icon {
  width: 1rem;
  text-align: center;
  color: var(--color-text-muted);
}

.motion-excerpt-menu-enter-active,
.motion-excerpt-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.motion-excerpt-menu-enter-from,
.motion-excerpt-menu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .motion-excerpt-menu-enter-active,
  .motion-excerpt-menu-leave-active {
    transition: opacity 0.12s ease;
  }
  .motion-excerpt-menu-enter-from,
  .motion-excerpt-menu-leave-to {
    transform: translateX(-50%);
  }
}
</style>
