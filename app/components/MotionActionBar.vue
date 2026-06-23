<script lang="ts">
/** A single action rendered in the FAB menu or the sticky pinned bar. */
export interface MotionBarAction {
  id: string
  label: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** When set, the action renders as a navigation link instead of emitting. */
  to?: string
  count?: number
  disabled?: boolean
  /** Shown sticky beside the FAB instead of inside its menu. */
  pinned?: boolean
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

const fabRef = ref<HTMLElement | null>(null)
const fabOpen = ref(false)

const pinnedActions = computed(() => props.actions.filter((action) => action.pinned))
const menuActions = computed(() => props.actions.filter((action) => !action.pinned))
const isEditing = computed(() => pinnedActions.value.length > 0)

const menuEntryCount = computed(() => {
  if (isEditing.value) return menuActions.value.length
  return menuActions.value.length + (props.showDiffToggle ? 1 : 0)
})

const showFab = computed(() => menuEntryCount.value > 0)
const hasMenu = computed(() => menuEntryCount.value > 1)
const singleMenuEntry = computed(() => (menuEntryCount.value === 1 ? menuActions.value[0] ?? null : null))

const fabTriggerIcon = computed(() => {
  if (fabOpen.value) return 'xmark'
  if (menuEntryCount.value === 1) {
    if (menuActions.value.length === 1) return singleMenuEntry.value?.icon ?? 'bars'
    return 'eye'
  }
  return 'bars'
})

const fabBadgeCount = computed(() => {
  if (!isEditing.value && props.showDiffToggle && props.diffCount > 0) return props.diffCount
  if (menuActions.value.length === 1) return singleMenuEntry.value?.count ?? 0
  return 0
})

const fabAriaLabel = computed(() => {
  if (fabOpen.value) return 'Aktionsmenü schließen'
  if (menuEntryCount.value === 1) {
    if (menuActions.value.length === 1) return singleMenuEntry.value?.label ?? 'Aktion'
    return showDiff.value ? 'Änderungsvorschläge ausblenden' : 'Zeige Änderungsvorschläge'
  }
  return 'Antrag-Aktionen öffnen'
})

function actionVariant(action: MotionBarAction) {
  return action.variant ?? 'primary'
}

function closeFab() {
  fabOpen.value = false
}

function onAction(action: MotionBarAction) {
  if (action.disabled) return
  closeFab()
  if (action.to) {
    void navigateTo(action.to)
    return
  }
  emit('action', action.id)
}

function onFabTrigger() {
  if (!showFab.value) return
  if (menuEntryCount.value === 1) {
    if (menuActions.value.length === 1) {
      onAction(menuActions.value[0]!)
      return
    }
    showDiff.value = !showDiff.value
    return
  }
  fabOpen.value = !fabOpen.value
}

function onDocumentClick(event: MouseEvent) {
  if (!fabOpen.value) return
  const target = event.target as Node
  if (fabRef.value && !fabRef.value.contains(target)) closeFab()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeFab()
}

watch(
  () => props.actions.map((action) => `${action.id}:${action.pinned ? 1 : 0}`).join('|'),
  () => closeFab(),
)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="action-fab" :class="{ 'is-editing': isEditing }">
    <div ref="fabRef" class="action-fab__dock">
      <div
        v-if="pinnedActions.length"
        class="action-fab__pinned"
        role="toolbar"
        aria-label="Antragsaktionen"
      >
        <template v-for="action in pinnedActions" :key="action.id">
          <NuxtLink
            v-if="action.to && !action.disabled"
            :to="action.to"
            class="action-fab__pinned-btn"
            :class="`action-fab__pinned-btn--${actionVariant(action)}`"
            @click="closeFab"
          >
            <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
            {{ action.label }}
          </NuxtLink>
          <span
            v-else-if="action.to"
            class="action-fab__pinned-btn"
            :class="`action-fab__pinned-btn--${actionVariant(action)}`"
            aria-disabled="true"
          >
            <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
            {{ action.label }}
          </span>
          <FwButton
            v-else
            :variant="actionVariant(action)"
            :disabled="action.disabled"
            :class="{ 'action-fab__pinned-btn--delete': action.id === 'deleteDraft' }"
            @click="onAction(action)"
          >
            <FontAwesomeIcon v-if="action.icon" :icon="action.icon" />
            {{ action.label }}
          </FwButton>
        </template>
      </div>

      <div v-if="showFab" class="action-fab__menu">
        <Transition name="action-fab__pop">
          <div
            v-if="fabOpen && hasMenu"
            id="motion-action-fab-menu"
            class="action-fab__panel"
            role="menu"
            @click.stop
          >
            <label v-if="showDiffToggle && !isEditing" class="action-fab__check">
              <input v-model="showDiff" type="checkbox" @click.stop>
              <span class="action-fab__check-label">
                Zeige Änderungsvorschläge
                <span v-if="diffCount > 0" class="action-bar__count action-bar__count--suggestions">
                  {{ diffCount }}
                </span>
              </span>
            </label>

            <div
              v-if="showDiffToggle && !isEditing && menuActions.length"
              class="action-fab__divider"
            />

            <template v-for="item in menuActions" :key="item.id">
              <NuxtLink
                v-if="item.to"
                :to="item.to"
                class="action-fab__item"
                role="menuitem"
                @click.stop="onAction(item)"
              >
                <FontAwesomeIcon v-if="item.icon" :icon="item.icon" class="action-fab__item-icon" />
                <span class="action-fab__item-label">{{ item.label }}</span>
                <span v-if="item.count != null" class="action-bar__count">{{ item.count }}</span>
              </NuxtLink>
              <button
                v-else
                type="button"
                class="action-fab__item"
                :class="{
                  'action-fab__item--primary': item.variant === 'primary',
                  'action-fab__item--ballot': item.id === 'startBallot',
                  'action-fab__item--archive': item.id === 'archive',
                }"
                role="menuitem"
                :disabled="item.disabled"
                @click.stop="onAction(item)"
              >
                <FontAwesomeIcon v-if="item.icon" :icon="item.icon" class="action-fab__item-icon" />
                <span class="action-fab__item-label">{{ item.label }}</span>
                <span v-if="item.count != null" class="action-bar__count">{{ item.count }}</span>
              </button>
            </template>
          </div>
        </Transition>

        <button
          type="button"
          class="action-fab__trigger"
          :class="{ 'is-open': fabOpen }"
          :aria-expanded="hasMenu ? fabOpen : undefined"
          :aria-haspopup="hasMenu ? 'menu' : undefined"
          :aria-controls="hasMenu ? 'motion-action-fab-menu' : undefined"
          :aria-label="fabAriaLabel"
          @click.stop="onFabTrigger"
        >
          <FontAwesomeIcon :icon="fabTriggerIcon" class="action-fab__trigger-icon" />
          <span v-if="!fabOpen && fabBadgeCount > 0" class="action-fab__badge">
            {{ fabBadgeCount }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sticky anchor that reserves almost no vertical space; controls float above it. */
.action-fab {
  position: sticky;
  bottom: var(--space-5);
  z-index: 30;
  height: 0;
  margin-top: var(--space-2);
  pointer-events: none;
}

.action-fab__dock {
  position: absolute;
  right: var(--space-2);
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: auto;
}

.action-fab.is-editing .action-fab__dock {
  left: var(--space-2);
  right: var(--space-2);
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-4);
  position: absolute;
}

.action-fab.is-editing .action-fab__menu {
  position: absolute;
  right: 0;
  bottom: 0;
}

.action-fab__pinned {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
}

.action-fab__pinned :deep(.action-fab__pinned-btn--delete:hover:not(:disabled)) {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
}

.action-fab__pinned-btn {
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
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.action-fab__pinned-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.action-fab__pinned-btn[aria-disabled='true'] {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.action-fab__pinned-btn--primary {
  background: var(--brand-yellow);
  color: #1a1a00;
}

.action-fab__pinned-btn--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.action-fab__pinned-btn--ghost:hover {
  background: var(--color-bg);
}

.action-fab__pinned-btn--secondary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.action-fab__menu {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  flex-shrink: 0;
}

.action-fab__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 50%;
  background: linear-gradient(
    145deg,
    var(--color-tertiary) 0%,
    color-mix(in srgb, var(--color-tertiary) 82%, #ffffff) 100%
  );
  color: var(--color-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  box-shadow:
    0 6px 20px color-mix(in srgb, var(--color-tertiary) 55%, transparent),
    0 2px 6px color-mix(in srgb, #000 16%, transparent);
  transition:
    transform 0.18s ease,
    box-shadow 0.22s ease,
    background 0.22s ease,
    color 0.22s ease;
}

.action-fab__trigger:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--color-tertiary) 88%, #ffffff) 0%,
    var(--color-tertiary) 100%
  );
  box-shadow:
    0 12px 32px color-mix(in srgb, var(--color-tertiary) 62%, transparent),
    0 3px 10px color-mix(in srgb, #000 18%, transparent);
}

.action-fab__trigger:active:not(:disabled) {
  transform: translateY(0);
}

.action-fab__trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.action-fab__trigger.is-open {
  background: var(--color-bg-elevated);
  color: var(--color-text);
  box-shadow:
    0 0 0 1px var(--color-border),
    var(--shadow-md);
}

.action-fab__trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-fab__trigger-icon {
  transition: transform 0.2s ease;
}

.action-fab__trigger.is-open .action-fab__trigger-icon {
  transform: rotate(90deg);
}

.action-fab__badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: #1a1a00;
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px var(--color-bg);
}

.action-fab__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--space-3));
  width: max-content;
  min-width: 15rem;
  max-width: min(22rem, calc(100vw - 2 * var(--space-4)));
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg, var(--shadow-md));
  transform-origin: bottom right;
}

.action-fab__check {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
  transition: background 0.18s ease;
}

.action-fab__check:hover {
  background: var(--color-bg);
}

.action-fab__check input {
  width: 1.1rem;
  height: 1.1rem;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.action-fab__check-label {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}

.action-fab__divider {
  height: 1px;
  margin: var(--space-1) var(--space-2);
  background: var(--color-border);
}

.action-fab__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.action-fab__item:hover:not(:disabled) {
  background: var(--color-bg);
  color: var(--color-accent);
}

.action-fab__item--primary {
  color: var(--color-accent);
}

.action-fab__item--ballot {
  color: var(--color-primary);
}

.action-fab__item--ballot:hover:not(:disabled) {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.action-fab__item--archive:hover:not(:disabled) {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.action-fab__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-fab__item-icon {
  width: 1.25rem;
  flex-shrink: 0;
  text-align: center;
}

.action-fab__item-label {
  flex: 1;
  white-space: nowrap;
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

.action-bar__count--suggestions {
  background: var(--color-primary);
  color: #1a1a00;
  font-weight: 700;
}

.action-fab__pop-enter-active,
.action-fab__pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.action-fab__pop-enter-from,
.action-fab__pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

@media (max-width: 600px) {
  .action-fab__dock {
    right: var(--space-1);
  }

  .action-fab__trigger {
    width: 2.85rem;
    height: 2.85rem;
    font-size: 1.05rem;
  }

  .action-fab__panel {
    min-width: 14rem;
    max-width: min(17rem, calc(100vw - 2 * var(--space-3)));
    padding: var(--space-1);
    gap: 0;
  }

  .action-fab__item,
  .action-fab__check {
    padding: var(--space-2) var(--space-3);
    font-size: 0.82rem;
    gap: var(--space-2);
  }

  .action-fab__item-icon {
    width: 1rem;
    font-size: 0.85rem;
  }

  .action-fab__badge {
    min-width: 1.2rem;
    height: 1.2rem;
    font-size: 0.72rem;
  }

  .action-fab__pinned :deep(.fw-btn) {
    padding-inline: var(--space-3);
    font-size: 0.82rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-fab__trigger,
  .action-fab__trigger-icon,
  .action-fab__item,
  .action-fab__pop-enter-active,
  .action-fab__pop-leave-active {
    transition: none;
  }
}
</style>
