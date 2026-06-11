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
// Remaining suggestions while the author reviews inline.
const reviewPendingCount = defineModel<number>('reviewPendingCount', { default: 0 })

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

const diffTeleportTarget = computed(() => `#motion-body-diff-${props.motionId}`)

watch(openCount, (v) => (count.value = v), { immediate: true })

watch(
  reviewPending,
  (items) => {
    reviewPendingCount.value = items.length
  },
  { immediate: true, deep: true },
)

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
  reviewPending.value = []
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
  reviewPending.value = []
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

function acceptAll() {
  const ids = reviewPending.value.map((s) => s.id)
  for (const id of ids) editorRef.value?.acceptSuggestion(id)
  reviewPending.value = []
}

function rejectAll() {
  const ids = reviewPending.value.map((s) => s.id)
  for (const id of ids) editorRef.value?.rejectSuggestion(id)
  reviewPending.value = []
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
    reviewPending.value = []
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
defineExpose({ startReview, cancel, submitProposal, saveReview, acceptAll, rejectAll })
</script>

<template>
  <section class="suggestions">
    <!-- Diff view is teleported into the parent motion body for in-place crossfade. -->
    <ClientOnly>
      <Teleport
        v-if="mode === 'idle' && showDiff && openCount > 0 && docJson"
        :to="diffTeleportTarget"
      >
        <MotionEditor
          embedded
          :doc-json="docJson"
          :review-items="suggestions"
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

    <!-- Review mode: author accepts/rejects inline, then saves a new version -->
    <div v-else-if="mode === 'review'" class="suggestions__editor">
      <ClientOnly>
        <MotionEditor
          ref="editorRef"
          :doc-json="docJson"
          :review-items="reviewPending"
          :suggestion="{ mode: 'review', ...suggestionConfig }"
          @review-accept="acceptOne"
          @review-reject="rejectOne"
        />
      </ClientOnly>
      <p v-if="reviewPending.length" class="suggestions__lead">
        <FontAwesomeIcon icon="comment-dots" aria-hidden="true" />
        Fahre mit der Maus über eine Änderung im Text, um sie anzunehmen oder abzulehnen.
      </p>
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
