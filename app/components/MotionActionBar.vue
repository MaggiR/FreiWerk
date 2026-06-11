<script lang="ts">
/** A single action rendered in the bar or its overflow menu. */
export interface MotionBarAction {
  id: string
  label: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** When set, the action renders as a navigation link instead of emitting. */
  to?: string
  count?: number
  disabled?: boolean
}
</script>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    actions?: MotionBarAction[]
    showDiffToggle?: boolean
    diffCount?: number
  }>(),
  {
    actions: () => [],
    showDiffToggle: false,
    diffCount: 0,
  },
)

const showDiff = defineModel<boolean>('showDiff', { default: false })
const emit = defineEmits<{ action: [id: string] }>()

const barRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)
const endRef = ref<HTMLElement | null>(null)
const moreMeasureRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const isNarrow = ref(false)
const inlineCount = ref(props.actions.length)

const showInlineDiff = computed(() => props.showDiffToggle && !isNarrow.value)

const inlineActions = computed(() => props.actions.slice(0, inlineCount.value))

const overflowActions = computed(() => props.actions.slice(inlineCount.value))

const effectiveMenuItems = computed<MotionBarAction[]>(() => {
  const items = [...overflowActions.value]
  if (props.showDiffToggle && isNarrow.value) {
    items.unshift({
      id: 'toggle-diff',
      label: showDiff.value ? 'Änderungen ausblenden' : 'Änderungen anzeigen',
      count: props.diffCount > 0 ? props.diffCount : undefined,
    })
  }
  return items
})

function actionVariant(action: MotionBarAction) {
  return action.variant ?? 'primary'
}

function onAction(action: MotionBarAction) {
  if (!action.to) emit('action', action.id)
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onItem(item: MotionBarAction) {
  closeMenu()
  if (item.id === 'toggle-diff') {
    showDiff.value = !showDiff.value
    return
  }
  if (!item.to) emit('action', item.id)
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value || !menuRef.value) return
  if (!menuRef.value.contains(event.target as Node)) closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

function recalculateOverflow() {
  const bar = barRef.value
  const measure = measureRef.value
  const end = endRef.value
  const moreBtn = moreMeasureRef.value
  if (!bar || !measure) return

  const barStyle = getComputedStyle(bar)
  const padX = parseFloat(barStyle.paddingLeft) + parseFloat(barStyle.paddingRight)
  const gap = parseFloat(barStyle.gap) || 0
  const endWidth = end?.offsetWidth ?? 0
  const moreWidth = (moreBtn?.offsetWidth ?? 0) + gap
  const available = bar.clientWidth - padX - endWidth - gap
  const buttons = measure.querySelectorAll<HTMLElement>('[data-action-measure]')
  const total = props.actions.length

  let used = 0
  let count = 0

  for (let i = 0; i < total; i++) {
    const btn = buttons[i]
    if (!btn) break

    const btnWidth = btn.offsetWidth
    const itemGap = count > 0 ? gap : 0
    const overflowCount = total - (i + 1)
    const reserveMore = overflowCount > 0 ? moreWidth : 0

    if (used + itemGap + btnWidth + reserveMore <= available) {
      used += itemGap + btnWidth
      count++
    } else {
      break
    }
  }

  inlineCount.value = count
}

let narrowMq: MediaQueryList | null = null
let resizeObserver: ResizeObserver | null = null

function syncNarrow() {
  if (narrowMq) isNarrow.value = narrowMq.matches
}

function scheduleRecalculate() {
  nextTick(() => {
    requestAnimationFrame(recalculateOverflow)
  })
}

watch(
  () => [props.actions, props.showDiffToggle, isNarrow.value] as const,
  () => {
    inlineCount.value = props.actions.length
    scheduleRecalculate()
  },
  { deep: true },
)

onMounted(() => {
  narrowMq = window.matchMedia('(max-width: 600px)')
  syncNarrow()
  narrowMq.addEventListener('change', syncNarrow)
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)

  if (barRef.value) {
    resizeObserver = new ResizeObserver(scheduleRecalculate)
    resizeObserver.observe(barRef.value)
  }

  scheduleRecalculate()
})

onUnmounted(() => {
  narrowMq?.removeEventListener('change', syncNarrow)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="action-bar-wrap">
    <div ref="barRef" class="action-bar" role="toolbar" aria-label="Antrag-Aktionen">
      <div class="action-bar__group action-bar__group--start">
        <template v-for="action in inlineActions" :key="action.id">
          <NuxtLink v-if="action.to" :to="action.to">
            <FwButton :variant="actionVariant(action)" :disabled="action.disabled">
              <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
              {{ action.label }}
              <span v-if="action.count != null" class="action-bar__count">{{ action.count }}</span>
            </FwButton>
          </NuxtLink>
          <FwButton
            v-else
            :variant="actionVariant(action)"
            :disabled="action.disabled"
            @click="onAction(action)"
          >
            <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
            {{ action.label }}
            <span v-if="action.count != null" class="action-bar__count">{{ action.count }}</span>
          </FwButton>
        </template>
      </div>

      <div ref="endRef" class="action-bar__group action-bar__group--end">
        <FwSwitch v-if="showInlineDiff" v-model="showDiff" class="action-bar__diff">
          Änderungen anzeigen
          <span v-if="diffCount > 0" class="action-bar__count">{{ diffCount }}</span>
        </FwSwitch>

        <div v-if="effectiveMenuItems.length" ref="menuRef" class="action-bar__menu">
          <button
            type="button"
            class="action-bar__more"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            aria-controls="motion-action-menu"
            @click.stop="toggleMenu"
          >
            <FontAwesomeIcon icon="ellipsis" />
            <span class="action-bar__more-label">Mehr</span>
            <FontAwesomeIcon icon="chevron-down" class="action-bar__chevron" aria-hidden="true" />
          </button>
          <div
            v-show="menuOpen"
            id="motion-action-menu"
            class="action-bar__panel"
            role="menu"
          >
            <template v-for="item in effectiveMenuItems" :key="item.id">
              <NuxtLink
                v-if="item.to"
                :to="item.to"
                class="action-bar__item"
                role="menuitem"
                @click="closeMenu"
              >
                <FontAwesomeIcon
                  v-if="item.icon"
                  :icon="item.icon"
                  class="action-bar__item-icon"
                />
                <span class="action-bar__item-label">{{ item.label }}</span>
                <span v-if="item.count != null" class="action-bar__count">{{ item.count }}</span>
              </NuxtLink>
              <button
                v-else
                type="button"
                class="action-bar__item"
                role="menuitem"
                :disabled="item.disabled"
                @click="onItem(item)"
              >
                <FontAwesomeIcon
                  v-if="item.icon"
                  :icon="item.icon"
                  class="action-bar__item-icon"
                />
                <span class="action-bar__item-label">{{ item.label }}</span>
                <span v-if="item.count != null" class="action-bar__count">{{ item.count }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div ref="measureRef" class="action-bar__measure" aria-hidden="true">
      <template v-for="action in actions" :key="`measure-${action.id}`">
        <span data-action-measure class="action-bar__measure-btn">
          <FwButton :variant="actionVariant(action)" :disabled="action.disabled">
            <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
            {{ action.label }}
            <span v-if="action.count != null" class="action-bar__count">{{ action.count }}</span>
          </FwButton>
        </span>
      </template>
      <button ref="moreMeasureRef" type="button" class="action-bar__more" tabindex="-1">
        <FontAwesomeIcon icon="ellipsis" />
        <span class="action-bar__more-label">Mehr</span>
        <FontAwesomeIcon icon="chevron-down" class="action-bar__chevron" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-bar-wrap {
  position: sticky;
  bottom: var(--space-4);
  z-index: 30;
  width: calc(100% - var(--space-4));
  max-width: 100%;
  margin: var(--space-4) auto 0;
}

.action-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
}

.action-bar__group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.action-bar__group--start {
  flex-wrap: nowrap;
  overflow: hidden;
}

.action-bar__group--end {
  margin-left: auto;
  flex-shrink: 0;
}

.action-bar__diff {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.action-bar__menu {
  position: relative;
  flex-shrink: 0;
}

.action-bar__more {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.action-bar__more:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.action-bar__chevron {
  font-size: 0.8rem;
}

.action-bar__panel {
  position: absolute;
  bottom: calc(100% + var(--space-2));
  right: 0;
  z-index: 20;
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.action-bar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.action-bar__item:hover:not(:disabled) {
  background: var(--color-bg);
  color: var(--color-accent);
}

.action-bar__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-bar__item-icon {
  width: 1.25rem;
  flex-shrink: 0;
  text-align: center;
}

.action-bar__item-label {
  flex: 1;
}

.action-bar__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.1rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.action-bar__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 0;
  overflow: hidden;
  white-space: nowrap;
}

.action-bar__measure-btn {
  display: inline-flex;
}

@media (max-width: 600px) {
  .action-bar {
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .action-bar__group {
    flex: 1 1 auto;
  }

  .action-bar__more-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-bar__more,
  .action-bar__item {
    transition: none;
  }
}
</style>
