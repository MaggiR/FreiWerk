<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'
import type { MotionSuggestionsResponse, SuggestionItem } from '../../shared/types'
import { countOpenSuggestionsInJson } from '~/editor/suggestions'

const props = defineProps<{
  motionId: string
  motionBodyHtml: string
  proposeSignal?: number
}>()

const emit = defineEmits<{ saved: [] }>()

// Reflects the open suggestion count to the parent (e.g. for an action badge).
const count = defineModel<number>('count', { default: 0 })
// Toggles the in-place diff overlay in the parent motion body.
const showDiff = defineModel<boolean>('showDiff', { default: false })
// Current flow state, surfaced so the parent action bar can drive submit/cancel.
const mode = defineModel<'idle' | 'propose' | 'review'>('mode', { default: 'idle' })
// True while a submit/save request is in flight (disables the bar's primary action).
const busy = defineModel<boolean>('busy', { default: false })

const { user } = useAuthUser()
const toast = useToast()

const { data, refresh } = await useFetch<MotionSuggestionsResponse>(
  () => `/api/motions/${props.motionId}/suggestions`,
  { key: computed(() => `suggestions-${props.motionId}`) },
)

const openCount = computed(() => data.value?.openCount ?? 0)
const suggestions = computed<SuggestionItem[]>(() => data.value?.suggestions ?? [])
const docJson = computed<JSONContent | null>(
  () => (data.value?.docJson as JSONContent | null) ?? null,
)
const revision = computed(() => data.value?.revision ?? 0)

const suggestionConfig = computed(() => ({
  userId: user.value?.id ?? '',
  userName: user.value?.displayName ?? 'Mitglied',
}))

interface EditorApi {
  getJSON: () => JSONContent | null
  getCleanHtml: () => string
  acceptSuggestion: (id: number) => void
  rejectSuggestion: (id: number) => void
  stampAuthors: () => void
}

const editorRef = ref<EditorApi | null>(null)
const errorMsg = ref('')
const conflict = ref(false)
const reviewPending = ref<SuggestionItem[]>([])

const typeLabels: Record<SuggestionItem['type'], string> = {
  insertion: 'Einfügung',
  deletion: 'Löschung',
  modification: 'Formatierung',
}

const diffTeleportTarget = computed(() => `#motion-body-diff-${props.motionId}`)

watch(openCount, (v) => (count.value = v), { immediate: true })

function startPropose() {
  errorMsg.value = ''
  conflict.value = false
  showDiff.value = false
  mode.value = 'propose'
}

// Parent triggers propose mode by incrementing `proposeSignal`.
watch(
  () => props.proposeSignal,
  (next, prev) => {
    if (next != null && next !== prev) startPropose()
  },
)

function startReview() {
  errorMsg.value = ''
  conflict.value = false
  showDiff.value = false
  reviewPending.value = [...suggestions.value]
  mode.value = 'review'
}

function cancel() {
  mode.value = 'idle'
  errorMsg.value = ''
}

function handleError(err: unknown) {
  const status = (err as { statusCode?: number; response?: { status?: number } })
  const code = status.statusCode ?? status.response?.status
  if (code === 409) {
    conflict.value = true
    const msg = 'Das Arbeitsdokument wurde zwischenzeitlich geändert. Bitte neu laden.'
    errorMsg.value = msg
    toast.error(msg)
  } else {
    const msg = extractError(err, 'Aktion fehlgeschlagen.')
    errorMsg.value = ''
    toast.error(msg)
  }
}

async function reloadAfterConflict() {
  await refresh()
  conflict.value = false
  errorMsg.value = ''
  mode.value = 'idle'
}

async function submitProposal() {
  if (!editorRef.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    editorRef.value.stampAuthors()
    const json = editorRef.value.getJSON()
    if (!json) return
    const openSuggestions = countOpenSuggestionsInJson(json)
    if (openSuggestions === 0) {
      toast.error(
        'Es wurden keine Änderungsvorschläge erkannt. Bitte ändere den Text im Vorschlagsmodus erneut.',
      )
      return
    }
    await $fetch(`/api/motions/${props.motionId}/suggestions`, {
      method: 'PUT',
      body: { docJson: json, baseRevision: revision.value },
    })
    await refresh()
    mode.value = 'idle'
    // Reveal the diff immediately so the member sees their tracked change.
    showDiff.value = true
    toast.success('Dein Änderungsvorschlag wurde gespeichert und ist nun einsehbar.')
  } catch (err: unknown) {
    handleError(err)
  } finally {
    busy.value = false
  }
}

function acceptOne(id: number) {
  editorRef.value?.acceptSuggestion(id)
  reviewPending.value = reviewPending.value.filter((s) => s.id !== id)
}

function rejectOne(id: number) {
  editorRef.value?.rejectSuggestion(id)
  reviewPending.value = reviewPending.value.filter((s) => s.id !== id)
}

async function saveReview() {
  if (!editorRef.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    const cleanHtml = editorRef.value.getCleanHtml()
    const working = editorRef.value.getJSON()
    const remaining = working ? countOpenSuggestionsInJson(working) : 0
    await $fetch(`/api/motions/${props.motionId}/suggestions/save`, {
      method: 'POST',
      body: {
        cleanHtml,
        workingDocJson: remaining > 0 ? working : null,
        baseRevision: revision.value,
      },
    })
    await refresh()
    mode.value = 'idle'
    showDiff.value = false
    emit('saved')
    toast.success('Die Änderungen wurden übernommen und als neue Version gespeichert.')
  } catch (err: unknown) {
    handleError(err)
  } finally {
    busy.value = false
  }
}

// Driven by the parent MotionActionBar (the trigger/submit buttons live there).
defineExpose({ startReview, cancel, submitProposal, saveReview })
</script>

<template>
  <section class="suggestions">
    <!-- Diff view is teleported into the parent motion body for in-place crossfade. -->
    <ClientOnly>
      <Teleport
        v-if="mode === 'idle' && openCount > 0 && docJson"
        :to="diffTeleportTarget"
      >
        <MotionEditor
          embedded
          :doc-json="docJson"
          :suggestion="{ mode: 'view', ...suggestionConfig }"
        />
      </Teleport>
    </ClientOnly>

    <Transition name="swap" mode="out-in">
    <!-- Propose mode: member edits, changes are tracked as suggestions -->
    <div v-if="mode === 'propose'" class="suggestions__editor">
      <ClientOnly>
        <MotionEditor
          ref="editorRef"
          :initial-content="motionBodyHtml"
          :doc-json="docJson"
          :suggestion="{ mode: 'propose', ...suggestionConfig }"
        />
      </ClientOnly>
      <p class="suggestions__lead">
        <FontAwesomeIcon icon="comment-dots" aria-hidden="true" />
        Deine Änderungen werden dem Antragsteller als Vorschläge vorgelegt und sind
        offen für andere einsehbar.
      </p>
    </div>

    <!-- Review mode: author accepts/rejects, then saves a new version -->
    <div v-else-if="mode === 'review'" class="suggestions__editor">
      <ClientOnly>
        <MotionEditor
          ref="editorRef"
          :doc-json="docJson"
          :suggestion="{ mode: 'review', ...suggestionConfig }"
        />
      </ClientOnly>

      <ol v-if="reviewPending.length" class="suggestions__list">
        <li v-for="item in reviewPending" :key="item.id" class="suggestions__item">
          <div class="suggestions__item-info">
            <FwBadge :tone="item.type === 'deletion' ? 'neutral' : 'tertiary'">
              {{ typeLabels[item.type] }}
            </FwBadge>
            <span class="suggestions__snippet">{{ item.snippet || '—' }}</span>
            <span v-if="item.authorName" class="suggestions__author">
              <FontAwesomeIcon icon="user" /> {{ item.authorName }}
            </span>
          </div>
          <div class="suggestions__item-actions">
            <button
              type="button"
              class="suggestions__accept"
              title="Annehmen"
              aria-label="Annehmen"
              @click="acceptOne(item.id)"
            >
              <FontAwesomeIcon icon="check" />
            </button>
            <button
              type="button"
              class="suggestions__reject"
              title="Verwerfen"
              aria-label="Verwerfen"
              @click="rejectOne(item.id)"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </div>
        </li>
      </ol>
      <p v-else class="suggestions__hint">
        Alle Vorschläge bearbeitet. Speichern legt eine neue Version an.
      </p>
    </div>
    </Transition>

    <div v-if="errorMsg" class="suggestions__error form-error">
      {{ errorMsg }}
      <FwButton v-if="conflict" variant="secondary" @click="reloadAfterConflict">
        <FontAwesomeIcon icon="rotate-left" /> Neu laden
      </FwButton>
    </div>
  </section>
</template>

<style scoped>
.suggestions__hint {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.suggestions__lead {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.suggestions__editor {
  margin-top: var(--space-4);
}
.suggestions__list {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.suggestions__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.suggestions__item-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
}
.suggestions__snippet {
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 28ch;
}
.suggestions__author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.suggestions__item-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
.suggestions__accept,
.suggestions__reject {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.suggestions__accept:hover {
  border-color: #0a9f5e;
  color: #0a9f5e;
  background: color-mix(in srgb, #0a9f5e 12%, transparent);
}
.suggestions__reject:hover {
  border-color: #d91e36;
  color: #d91e36;
  background: color-mix(in srgb, #d91e36 12%, transparent);
}
.suggestions__error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.swap-enter-active {
  transition: opacity 0.25s ease;
  transition-delay: 0.05s;
}
.swap-leave-active {
  transition: opacity 0.18s ease;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .swap-enter-active,
  .swap-leave-active {
    transition: none;
  }
}
</style>
