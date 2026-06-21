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
    motionVersion?: number | null
    selectedKeys?: Set<string>
  }>(),
  { motionVersion: null, selectedKeys: () => new Set<string>() },
)

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ add: [ref: ReferenceDraft] }>()

const items = ref<ReferenceableItem[]>([])
const loading = ref(false)
const search = ref('')
const excerptText = ref('')

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
    excerptText.value = ''
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

function addExcerpt() {
  const text = excerptText.value.trim()
  if (text.length === 0) return
  emit('add', {
    targetType: 'motion_excerpt',
    targetId: props.motionId,
    label: text,
    excerptText: text,
    excerptVersion: props.motionVersion ?? undefined,
  })
  excerptText.value = ''
}
</script>

<template>
  <div v-if="open" class="refpick" @click.self="open = false">
    <div class="refpick__panel" role="dialog" aria-label="Bezug hinzufügen">
      <header class="refpick__head">
        <h3 class="refpick__title">Bezug hinzufügen</h3>
        <button
          type="button"
          class="refpick__close"
          aria-label="Schließen"
          @click="open = false"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>
      </header>

      <section class="refpick__excerpt">
        <label class="refpick__excerpt-label">
          <FontAwesomeIcon icon="quote-left" /> Antragstext zitieren
        </label>
        <div class="refpick__excerpt-row">
          <textarea
            v-model="excerptText"
            class="refpick__excerpt-input"
            rows="2"
            placeholder="Markierten/kopierten Antragstext hier einfügen …"
          />
          <FwButton
            type="button"
            variant="secondary"
            :disabled="excerptText.trim().length === 0"
            @click="addExcerpt"
          >
            Hinzufügen
          </FwButton>
        </div>
      </section>

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
    </div>
  </div>
</template>

<style scoped>
.refpick {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-text) 40%, transparent);
}
.refpick__panel {
  display: flex;
  flex-direction: column;
  width: min(32rem, 100%);
  max-height: min(80vh, 40rem);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}
.refpick__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.refpick__title {
  margin: 0;
  font-size: 1rem;
}
.refpick__close {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
}
.refpick__excerpt {
  margin-bottom: var(--space-3);
}
.refpick__excerpt-label {
  display: block;
  margin-bottom: var(--space-1);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-muted);
}
.refpick__excerpt-row {
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
}
.refpick__excerpt-input {
  flex: 1;
  resize: vertical;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.85rem;
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
</style>
