<script setup lang="ts">
import {
  REFERENCE_ICONS,
  type ReferenceDraft,
  type ReferenceableItem,
  type ReferenceTargetType,
} from '~/utils/references'
import { REFERENCE_TARGET_LABELS } from '#shared/constants'

const props = withDefaults(
  defineProps<{
    motionId: string
    selectedKeys?: Set<string>
  }>(),
  { selectedKeys: () => new Set<string>() },
)

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ add: [ref: ReferenceDraft] }>()

const items = ref<ReferenceableItem[]>([])
const loading = ref(false)
const search = ref('')

const GROUP_ORDER: ReferenceTargetType[] = [
  'argument',
  'question',
  'answer',
  'resource',
  'post',
]

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ items: ReferenceableItem[] }>(
      `/api/motions/${props.motionId}/referenceables`,
    )
    items.value = data.items
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    search.value = ''
    load()
  }
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  const list = term
    ? items.value.filter((i) => i.label.toLowerCase().includes(term))
    : items.value
  return GROUP_ORDER.map((type) => ({
    type,
    label: REFERENCE_TARGET_LABELS[type],
    entries: list.filter((i) => i.targetType === type),
  })).filter((group) => group.entries.length > 0)
})

function keyOf(item: ReferenceableItem): string {
  return `${item.targetType}:${item.targetId}`
}

function isSelected(item: ReferenceableItem): boolean {
  return props.selectedKeys.has(keyOf(item))
}

function addItem(item: ReferenceableItem) {
  if (isSelected(item)) return
  emit('add', {
    targetType: item.targetType,
    targetId: item.targetId,
    label: item.label,
  })
}

function close() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="refpick">
      <div
        v-if="open"
        class="refpick"
        role="presentation"
        @click.self="close"
      >
        <FwCard
          class="refpick__card"
          glass
          pad
          role="dialog"
          aria-modal="true"
          aria-labelledby="refpick-title"
        >
          <header class="refpick__head">
            <h2 id="refpick-title" class="refpick__title">Referenz hinzufügen</h2>
            <button
              type="button"
              class="refpick__close"
              aria-label="Schließen"
              @click="close"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </header>

          <input
            v-model="search"
            type="search"
            class="refpick__search"
            placeholder="Elemente durchsuchen …"
          >

          <div class="refpick__list">
            <p v-if="loading" class="refpick__hint">Elemente werden geladen …</p>
            <p v-else-if="filtered.length === 0" class="refpick__hint">
              Keine referenzierbaren Elemente gefunden.
            </p>
            <div v-for="group in filtered" v-else :key="group.type" class="refpick__group">
              <p class="refpick__group-title">
                <FontAwesomeIcon :icon="REFERENCE_ICONS[group.type]" /> {{ group.label }}
              </p>
              <button
                v-for="entry in group.entries"
                :key="entry.targetId"
                type="button"
                class="refpick__entry"
                :class="{ 'is-selected': isSelected(entry) }"
                :disabled="isSelected(entry)"
                @click="addItem(entry)"
              >
                <span class="refpick__entry-label">{{ entry.label }}</span>
                <FontAwesomeIcon :icon="isSelected(entry) ? 'check' : 'plus'" />
              </button>
            </div>
          </div>
        </FwCard>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.refpick {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(3, 45, 103, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dark .refpick {
  background: rgba(0, 0, 0, 0.55);
}

.refpick__card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(32rem, 100%);
  max-height: min(80vh, 40rem);
}

.refpick__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.refpick__title {
  margin: 0;
  padding-right: var(--space-6);
  font-size: 1rem;
}

.refpick__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.refpick__close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.refpick__search {
  margin-bottom: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.refpick__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.refpick__hint {
  padding: var(--space-3);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.refpick__group {
  margin-bottom: var(--space-3);
}

.refpick__group-title {
  margin: 0 0 var(--space-1);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-accent);
}

.refpick__entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  margin-bottom: 0.25rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}

.refpick__entry:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.refpick__entry.is-selected {
  opacity: 0.6;
  cursor: default;
}

.refpick__entry-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refpick-enter-active,
.refpick-leave-active {
  transition: opacity 0.22s ease;
}

.refpick-enter-active .refpick__card,
.refpick-leave-active .refpick__card {
  transition:
    opacity 0.22s ease,
    transform 0.24s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.refpick-enter-from,
.refpick-leave-to {
  opacity: 0;
}

.refpick-enter-from .refpick__card,
.refpick-leave-to .refpick__card {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .refpick-enter-active,
  .refpick-leave-active,
  .refpick-enter-active .refpick__card,
  .refpick-leave-active .refpick__card {
    transition: opacity 0.12s ease;
  }

  .refpick-enter-from .refpick__card,
  .refpick-leave-to .refpick__card {
    transform: none;
  }
}
</style>
