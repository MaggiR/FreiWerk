<script setup lang="ts">
import type { DebateMessageMenuAction, DebateMessageMenuItem } from '~/utils/debateMessageMenu'

const props = defineProps<{
  open: boolean
  x: number
  y: number
  items: DebateMessageMenuItem[]
  showUpvote?: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [action: DebateMessageMenuAction]
}>()

const panelRef = ref<HTMLElement | null>(null)
const position = ref({ left: props.x, top: props.y })

const hasMenuItems = computed(() => props.items.length > 0)
const isVisible = computed(
  () => props.open && (hasMenuItems.value || props.showUpvote),
)

function clampPosition() {
  const panel = panelRef.value
  if (!panel) return

  const margin = 8
  const rect = panel.getBoundingClientRect()
  let left = props.x
  let top = props.y

  if (left + rect.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - rect.width - margin)
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - rect.height - margin)
  }

  position.value = { left, top }
}

function onClickOutside(event: MouseEvent) {
  if (!props.open) return
  const panel = panelRef.value
  if (panel && !panel.contains(event.target as Node)) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => [props.open, props.x, props.y, props.items.length, props.showUpvote] as const,
  () => {
    if (!props.open) return
    position.value = { left: props.x, top: props.y }
    nextTick(clampPosition)
  },
)

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="msg-menu" @after-enter="clampPosition">
      <div
        v-if="isVisible"
        ref="panelRef"
        class="msg-menu"
        role="presentation"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
        @click.stop
      >
        <div v-if="showUpvote" class="msg-menu__upvote">
          <slot name="upvote" />
        </div>
        <div v-if="hasMenuItems" class="msg-menu__unroll" role="menu">
          <div class="msg-menu__inner">
            <button
              v-for="item in items"
              :key="item.action"
              type="button"
              class="msg-menu__item"
              :class="{ 'msg-menu__item--danger': item.danger }"
              role="menuitem"
              @click="emit('select', item.action); emit('close')"
            >
              <FontAwesomeIcon class="msg-menu__icon" :icon="item.icon" />
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.msg-menu {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 11rem;
  transform-origin: top left;
}
.msg-menu__upvote {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-sm);
}
.msg-menu__upvote :deep(.upvote) {
  border-color: transparent;
  background: transparent;
}
.msg-menu__upvote :deep(.upvote:hover:not(:disabled)) {
  background: var(--color-bg);
}
.msg-menu__unroll {
  display: grid;
  grid-template-rows: 1fr;
  width: 100%;
}
.msg-menu__inner {
  min-height: 0;
  overflow: hidden;
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.msg-menu__item {
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
.msg-menu__item:hover {
  background: var(--color-bg);
}
.msg-menu__item--danger {
  color: var(--color-danger);
}
.msg-menu__item--danger:hover {
  background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg));
}
.msg-menu__icon {
  width: 1rem;
  text-align: center;
  color: var(--color-text-muted);
}
.msg-menu__item--danger .msg-menu__icon {
  color: var(--color-danger);
}

.msg-menu-enter-active,
.msg-menu-leave-active {
  transition: opacity 0.18s ease;
}
.msg-menu-enter-active .msg-menu__unroll,
.msg-menu-leave-active .msg-menu__unroll {
  transition: grid-template-rows 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.msg-menu-enter-from,
.msg-menu-leave-to {
  opacity: 0;
}
.msg-menu-enter-from .msg-menu__unroll,
.msg-menu-leave-to .msg-menu__unroll {
  grid-template-rows: 0fr;
}

@media (prefers-reduced-motion: reduce) {
  .msg-menu-enter-active,
  .msg-menu-leave-active,
  .msg-menu-enter-active .msg-menu__unroll,
  .msg-menu-leave-active .msg-menu__unroll {
    transition: opacity 0.12s ease;
  }
  .msg-menu-enter-from .msg-menu__unroll,
  .msg-menu-leave-to .msg-menu__unroll {
    grid-template-rows: 1fr;
  }
}
</style>
