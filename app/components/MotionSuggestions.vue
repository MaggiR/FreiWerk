<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'
import {
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
} from '#shared/constants'
import type { MotionSuggestionsResponse, SuggestionItem } from '../../shared/types'
import { countOpenSuggestionsInJson } from '~/editor/suggestions'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionBodyHtml: string
    proposeSignal?: number
    editSignal?: number
    titleDraft?: string
    summaryDraft?: string
    headerBaseline?: { title: string; summary: string } | null
  }>(),
  {
    proposeSignal: 0,
    editSignal: 0,
    headerBaseline: null,
  },
)

const emit = defineEmits<{ saved: [] }>()

// Reflects the open suggestion count to the parent (e.g. for an action badge).
const count = defineModel<number>('count', { default: 0 })
// Toggles the in-place diff overlay in the parent motion body.
const showDiff = defineModel<boolean>('showDiff', { default: false })
// Current flow state, surfaced so the parent action bar can drive submit/cancel.
const mode = defineModel<'idle' | 'propose' | 'review' | 'edit'>('mode', { default: 'idle' })
// True while a submit/save request is in flight (disables the bar's primary action).
const busy = defineModel<boolean>('busy', { default: false })
// Remaining suggestions while the author reviews inline.
const reviewPendingCount = defineModel<number>('reviewPendingCount', { default: 0 })

const { user } = useAuthUser()
const toast = useToast()

const { data } = await useFetch<MotionSuggestionsResponse>(
  () => `/api/motions/${props.motionId}/suggestions`,
  { key: computed(() => `suggestions-${props.motionId}`) },
)

const openCount = computed(() => data.value?.openCount ?? 0)
const suggestions = computed<SuggestionItem[]>(() => data.value?.suggestions ?? [])
const docJson = computed<JSONContent | null>(
  () => (data.value?.docJson as JSONContent | null) ?? null,
)
const revision = computed(() => data.value?.revision ?? 0)
const sessionRevision = ref(0)

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
const reviewPending = ref<SuggestionItem[]>([])
const editSessionKey = ref(0)
const sessionBaseline = ref<string | null>(null)
const sessionReviewCount = ref(0)

function captureSessionBaseline() {
  const ed = editorRef.value
  if (!ed) return
  const json = ed.getJSON()
  sessionBaseline.value = json ? JSON.stringify(json) : null
}

function headerChanged(): boolean {
  const baseline = props.headerBaseline
  if (!baseline || props.titleDraft === undefined) return false
  return (
    props.titleDraft.trim() !== baseline.title ||
    (props.summaryDraft ?? '').trim() !== baseline.summary
  )
}

function validateHeader(): string | null {
  if (props.titleDraft === undefined) return null
  const title = props.titleDraft.trim()
  const summary = (props.summaryDraft ?? '').trim()
  if (title.length < MOTION_TITLE_MIN) {
    return `Der Titel muss mindestens ${MOTION_TITLE_MIN} Zeichen haben.`
  }
  if (title.length > MOTION_TITLE_MAX) return 'Der Titel darf höchstens 150 Zeichen haben.'
  if (summary.length < MOTION_SUMMARY_MIN) {
    return 'Die Kurzbeschreibung muss mindestens 50 Zeichen haben.'
  }
  if (summary.length > MOTION_SUMMARY_MAX) {
    return 'Die Kurzbeschreibung darf höchstens 200 Zeichen haben.'
  }
  return null
}

function hasUnsavedChanges(): boolean {
  if (headerChanged()) return true
  if (reviewPending.value.length !== sessionReviewCount.value) return true
  if (sessionBaseline.value === null) return false
  const json = editorRef.value?.getJSON()
  const current = json ? JSON.stringify(json) : null
  return current !== sessionBaseline.value
}

async function reloadSuggestions(): Promise<MotionSuggestionsResponse> {
  const fresh = await $fetch<MotionSuggestionsResponse>(
    `/api/motions/${props.motionId}/suggestions`,
  )
  data.value = fresh
  return fresh
}

async function beginSession(targetMode: 'propose' | 'edit' | 'review') {
  const fresh = await reloadSuggestions()
  sessionRevision.value = fresh.revision
  showDiff.value = false
  if (targetMode === 'edit' || targetMode === 'review') {
    reviewPending.value = [...suggestions.value]
  } else {
    reviewPending.value = []
  }
  sessionReviewCount.value = reviewPending.value.length
  sessionBaseline.value = null
  editSessionKey.value += 1
  mode.value = targetMode
}

const diffTeleportTarget = computed(() => `#motion-body-diff-${props.motionId}`)

watch(
  [editorRef, () => editSessionKey.value, () => mode.value],
  ([ed, , currentMode]) => {
    if (!ed || currentMode === 'idle' || sessionBaseline.value !== null) return
    nextTick(() => {
      requestAnimationFrame(() => captureSessionBaseline())
    })
  },
  { flush: 'post' },
)

watch(openCount, (v) => (count.value = v), { immediate: true })

watch(
  reviewPending,
  (items) => {
    reviewPendingCount.value = items.length
  },
  { immediate: true, deep: true },
)

function startPropose() {
  void beginSession('propose')
}

// Parent triggers propose mode by incrementing `proposeSignal`.
watch(
  () => props.proposeSignal,
  (next, prev) => {
    if (next != null && next !== prev) startPropose()
  },
)

// Parent triggers author edit mode by incrementing `editSignal`.
watch(
  () => props.editSignal,
  (next, prev) => {
    if (next != null && next !== prev) startEdit()
  },
)

function startReview() {
  void beginSession('review')
}

function startEdit() {
  void beginSession('edit')
}

async function cancel() {
  if (hasUnsavedChanges()) {
    const confirmed = confirm(
      'Alle Änderungen werden verworfen. Möchtest du wirklich abbrechen?',
    )
    if (!confirmed) return
  }
  mode.value = 'idle'
  reviewPending.value = []
  sessionBaseline.value = null
  await reloadSuggestions()
}

async function handleError(err: unknown) {
  const status = (err as { statusCode?: number; response?: { status?: number } })
  const code = status.statusCode ?? status.response?.status
  if (code === 409) {
    toast.error(
      'Das Arbeitsdokument wurde zwischenzeitlich geändert. Bitte neu laden.',
    )
    await reloadSuggestions()
    sessionRevision.value = 0
    mode.value = 'idle'
    reviewPending.value = []
    sessionBaseline.value = null
  } else {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  }
}

async function submitProposal() {
  if (!editorRef.value) return
  busy.value = true
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
      body: { docJson: json, baseRevision: sessionRevision.value },
    })
    const fresh = await reloadSuggestions()
    sessionRevision.value = fresh.revision
    mode.value = 'idle'
    // Reveal the diff immediately so the member sees their tracked change.
    showDiff.value = true
    toast.success('Dein Änderungsvorschlag wurde gespeichert und ist nun einsehbar.')
  } catch (err: unknown) {
    await handleError(err)
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
  const headerError = validateHeader()
  if (headerError) {
    toast.error(headerError)
    return
  }
  busy.value = true
  try {
    const cleanHtml = editorRef.value.getCleanHtml()
    const working = editorRef.value.getJSON()
    const remaining = working ? countOpenSuggestionsInJson(working) : 0
    const payload: {
      cleanHtml: string
      workingDocJson: JSONContent | null
      baseRevision: number
      title?: string
      summary?: string
    } = {
      cleanHtml,
      workingDocJson: remaining > 0 ? working : null,
      baseRevision: sessionRevision.value,
    }
    if (props.titleDraft !== undefined) {
      payload.title = props.titleDraft.trim()
      payload.summary = (props.summaryDraft ?? '').trim()
    }
    await $fetch(`/api/motions/${props.motionId}/suggestions/save`, {
      method: 'POST',
      body: payload,
    })
    await reloadSuggestions()
    sessionRevision.value = 0
    mode.value = 'idle'
    reviewPending.value = []
    showDiff.value = false
    emit('saved')
    toast.success('Die Änderungen wurden übernommen und als neue Version gespeichert.')
  } catch (err: unknown) {
    await handleError(err)
  } finally {
    busy.value = false
  }
}

// Driven by the parent MotionActionBar
defineExpose({ startReview, startEdit, cancel, submitProposal, saveReview, acceptAll, rejectAll })
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
          :key="`propose-${editSessionKey}`"
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

    <!-- Review/edit mode: author accepts/rejects inline, then saves a new version -->
    <div v-else-if="mode === 'review' || mode === 'edit'" class="suggestions__editor">
      <ClientOnly>
        <MotionEditor
          :key="`${mode}-${editSessionKey}`"
          ref="editorRef"
          :doc-json="docJson"
          :initial-content="motionBodyHtml"
          :review-items="reviewPending"
          :suggestion="{ mode, ...suggestionConfig }"
          @review-accept="acceptOne"
          @review-reject="rejectOne"
        />
      </ClientOnly>
      <p v-if="mode === 'edit' && reviewPending.length" class="suggestions__lead">
        <FontAwesomeIcon icon="comment-dots" aria-hidden="true" />
        Bearbeite den Text und nimm Änderungsvorschläge per Hover-Popup an oder ab.
      </p>
      <p v-else-if="mode === 'edit'" class="suggestions__hint">
        Bearbeite Titel, Kurzbeschreibung und Antragstext. Speichern legt eine neue Version an.
      </p>
      <p v-else-if="reviewPending.length" class="suggestions__lead">
        <FontAwesomeIcon icon="comment-dots" aria-hidden="true" />
        Fahre mit der Maus über eine Änderung im Text, um sie anzunehmen oder abzulehnen.
      </p>
      <p v-else class="suggestions__hint">
        Alle Vorschläge bearbeitet. Speichern legt eine neue Version an.
      </p>
    </div>
    </Transition>
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
