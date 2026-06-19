<script setup lang="ts">
import {
  DEFAULT_DEBATE_DAYS,
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
} from '#shared/constants'
import type { MotionBarAction } from '~/components/MotionActionBar.vue'

const route = useRoute()
const id = route.params.id as string
const { user, isModerator, loggedIn } = useAuthUser()

const { data, error } = await useFetch(`/api/motions/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)
const watchCount = computed(() => data.value?.watchCount ?? 0)
const isWatched = computed(() => data.value?.isWatched ?? false)
const olderVersionCount = computed(() => data.value?.olderVersionCount ?? 0)

const isAuthor = computed(() => motion.value?.authorId === user.value?.id)
const isDraft = computed(() => motion.value?.status === 'draft')
const isDebate = computed(() => motion.value?.status === 'debate')
const isBallot = computed(() => motion.value?.status === 'ballot')
const isDecided = computed(() => motion.value?.status === 'decided')
const isArchived = computed(() => Boolean(motion.value?.archivedAt))
const canArchive = computed(() => isAuthor.value || isModerator.value)
const canManageBallot = computed(() => isAuthor.value || isModerator.value)

const archivePending = ref(false)
const archiveError = ref('')

async function onArchiveToggle() {
  const archive = !isArchived.value
  if (archive && !confirm('Antrag archivieren? Er erscheint dann nur noch im Archiv.')) {
    return
  }
  archiveError.value = ''
  archivePending.value = true
  try {
    await $fetch(`/api/motions/${id}/archive`, {
      method: 'POST',
      body: { archived: archive },
    })
    await refreshNuxtData()
  } catch (err: unknown) {
    archiveError.value = extractError(err, 'Aktion fehlgeschlagen.')
  } finally {
    archivePending.value = false
  }
}
const debateOpen = computed(() => {
  const m = motion.value
  if (!m || m.status !== 'debate') return false
  return !m.debateEndsAt || new Date(m.debateEndsAt).getTime() > Date.now()
})

/** Author may refine the motion until the ballot opens (debate deadline is for posts/votes only). */
const authorCanEdit = computed(() => isAuthor.value && isDebate.value)

const canSuggest = computed(() => loggedIn.value && debateOpen.value)

const showSuggestionDiff = ref(false)
const suggestionCount = ref(0)
const suggestionMode = ref<'idle' | 'propose' | 'review' | 'edit'>('idle')
const suggestionBusy = ref(false)
const reviewPendingCount = ref(0)
const suggestionsRef = ref<{
  startReview: () => void
  startEdit: () => void
  cancel: () => void
  submitProposal: () => void | Promise<void>
  saveReview: () => void | Promise<void>
  acceptAll: () => void
  rejectAll: () => void
} | null>(null)
const isSuggestionEditing = computed(() => suggestionMode.value !== 'idle')
const isAuthorEditing = computed(() => suggestionMode.value === 'edit')

const editTitle = ref('')
const editSummary = ref('')
const headerBaseline = ref<{ title: string; summary: string } | null>(null)
const titleDraftLength = computed(() => editTitle.value.length)
const summaryDraftLength = computed(() => editSummary.value.length)

watch(suggestionMode, (mode) => {
  if (mode === 'edit' && motion.value) {
    editTitle.value = motion.value.title
    editSummary.value = motion.value.summary
    headerBaseline.value = {
      title: motion.value.title,
      summary: motion.value.summary,
    }
  } else {
    headerBaseline.value = null
  }
})

// Reactive trigger: incrementing it tells MotionSuggestions to enter propose mode.
const proposeSignal = ref(0)
const editSignal = ref(0)

function onStartProposal() {
  proposeSignal.value += 1
}

useHead({
  title: () =>
    `${(isAuthorEditing.value ? editTitle.value : motion.value?.title) ?? 'Antrag'} — FreiWerk`,
})

const COLLAPSED_BODY_HEIGHT = '11rem'
const bodyExpanded = ref(false)
const bodyClip = ref<HTMLElement | null>(null)
const bodyMaxHeight = ref<string>(COLLAPSED_BODY_HEIGHT)
let bodyResetTimer: ReturnType<typeof setTimeout> | null = null

function onStartEdit() {
  bodyExpanded.value = false
  bodyMaxHeight.value = COLLAPSED_BODY_HEIGHT
  editSignal.value += 1
}

watch(isSuggestionEditing, (editing) => {
  if (editing) {
    bodyExpanded.value = false
    bodyMaxHeight.value = COLLAPSED_BODY_HEIGHT
  }
})

function setBodyExpanded(expanded: boolean) {
  if (bodyResetTimer) {
    clearTimeout(bodyResetTimer)
    bodyResetTimer = null
  }

  const el = bodyClip.value
  if (!el) {
    bodyExpanded.value = expanded
    bodyMaxHeight.value = expanded ? 'none' : COLLAPSED_BODY_HEIGHT
    return
  }

  const fullHeight = `${el.scrollHeight}px`

  if (expanded) {
    bodyMaxHeight.value = fullHeight
    bodyExpanded.value = true
    bodyResetTimer = setTimeout(() => {
      bodyMaxHeight.value = 'none'
      bodyResetTimer = null
    }, 350)
  } else {
    bodyMaxHeight.value = fullHeight
    bodyExpanded.value = false
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bodyMaxHeight.value = COLLAPSED_BODY_HEIGHT
      })
    })
  }
}

watch(
  () => id,
  () => {
    bodyExpanded.value = false
    bodyMaxHeight.value = COLLAPSED_BODY_HEIGHT
  },
)

const publishPending = ref(false)
const publishError = ref('')
const deletePending = ref(false)
const deleteError = ref('')
const draftBusy = computed(() => publishPending.value || deletePending.value)
const ballotPending = ref(false)
const ballotError = ref('')
const debatePostCount = ref(0)
const debatePostSort = ref<'recent' | 'oldest'>('recent')

async function onPublish() {
  if (!confirm('Antrag jetzt veröffentlichen? Danach ist keine Bearbeitung mehr möglich.')) {
    return
  }
  publishError.value = ''
  publishPending.value = true
  try {
    await $fetch(`/api/motions/${id}/publish`, {
      method: 'POST',
      body: { debateDays: DEFAULT_DEBATE_DAYS },
    })
    await refreshNuxtData()
  } catch (err: unknown) {
    publishError.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    publishPending.value = false
  }
}

async function onDeleteDraft() {
  if (!confirm('Diesen Entwurf endgültig löschen?')) return
  deleteError.value = ''
  deletePending.value = true
  try {
    await $fetch(`/api/motions/${id}`, { method: 'DELETE' })
    await navigateTo('/motions')
  } catch (err: unknown) {
    deleteError.value = extractError(err, 'Löschen fehlgeschlagen.')
  } finally {
    deletePending.value = false
  }
}

async function onStartBallot() {
  if (
    !confirm(
      'Abstimmung starten? Während der Abstimmung sind keine Beiträge, Änderungsvorschläge oder Stimmungsbilder mehr möglich.',
    )
  ) {
    return
  }
  ballotError.value = ''
  ballotPending.value = true
  try {
    await $fetch(`/api/motions/${id}/ballot/start`, { method: 'POST', body: {} })
    await refreshNuxtData()
  } catch (err: unknown) {
    ballotError.value = extractError(err, 'Abstimmung konnte nicht gestartet werden.')
  } finally {
    ballotPending.value = false
  }
}

// All motion-related actions in priority order; the bar shows as many inline as fit.
const barActions = computed<MotionBarAction[]>(() => {
  const m = motion.value
  if (!m) return []

  if (isSuggestionEditing.value) {
    const proposing = suggestionMode.value === 'propose'
    const reviewing =
      suggestionMode.value === 'review' || suggestionMode.value === 'edit'
    const submitLabel = proposing
      ? suggestionBusy.value
        ? 'Senden ...'
        : 'Vorschlag senden'
      : suggestionBusy.value
        ? 'Speichern ...'
        : 'Speichern'
    const actions: MotionBarAction[] = [
      {
        id: 'submit',
        label: submitLabel,
        icon: proposing ? 'paper-plane' : 'floppy-disk',
        variant: 'primary',
        disabled: suggestionBusy.value,
        pinned: true,
      },
      {
        id: 'cancel',
        label: 'Abbrechen',
        variant: 'ghost',
        disabled: suggestionBusy.value,
        pinned: true,
      },
    ]

    if (reviewing && reviewPendingCount.value > 0) {
      actions.push(
        {
          id: 'accept-all',
          label: 'Alle Vorschläge annehmen',
          icon: 'check',
          variant: 'secondary',
          disabled: suggestionBusy.value,
        },
        {
          id: 'reject-all',
          label: 'Alle Vorschläge ablehnen',
          icon: 'xmark',
          variant: 'ghost',
          disabled: suggestionBusy.value,
        },
      )
    }

    return actions
  }

  const actions: MotionBarAction[] = []

  if (isDraft.value && isAuthor.value) {
    actions.push({
      id: 'publish',
      label: publishPending.value ? 'Veröffentlichen ...' : 'Veröffentlichen',
      icon: 'paper-plane',
      variant: 'primary',
      disabled: draftBusy.value,
      pinned: true,
    })
    actions.push({
      id: 'editDraft',
      label: 'Bearbeiten',
      icon: 'pen-to-square',
      variant: 'ghost',
      to: `/motions/${m.id}/edit`,
      disabled: draftBusy.value,
      pinned: true,
    })
    actions.push({
      id: 'deleteDraft',
      label: deletePending.value ? 'Löschen ...' : 'Löschen',
      icon: 'trash',
      variant: 'ghost',
      disabled: draftBusy.value,
      pinned: true,
    })
  }

  if (isAuthor.value && isDebate.value) {
    actions.push({
      id: 'startBallot',
      label: ballotPending.value ? 'Abstimmung starten ...' : 'Abstimmung starten',
      icon: 'check-to-slot',
      variant: 'primary',
      disabled: ballotPending.value,
    })
  }

  if (!isDraft.value && authorCanEdit.value) {
    actions.push({
      id: 'edit',
      label: 'Bearbeiten',
      icon: 'pen-to-square',
      variant: 'secondary',
    })
  } else if (canSuggest.value) {
    actions.push({
      id: 'propose',
      label: 'Änderungen vorschlagen',
      icon: 'pen',
      variant: 'secondary',
    })
  }

  if (!isDraft.value) {
    actions.push({
      id: 'versions',
      label: 'Versionen',
      icon: 'clock-rotate-left',
      to: `/motions/${m.id}/versions`,
      count: olderVersionCount.value,
      variant: 'ghost',
    })
  }

  if (canArchive.value && !isDraft.value) {
    actions.push({
      id: 'archive',
      label: isArchived.value ? 'Aus Archiv holen' : 'Archivieren',
      icon: 'box-archive',
      variant: 'ghost',
      disabled: archivePending.value,
    })
  }

  return actions
})

const showDiffToggle = computed(
  () => !isSuggestionEditing.value && isDebate.value && suggestionCount.value > 0,
)

watch(isDebate, (debate) => {
  if (!debate) showSuggestionDiff.value = false
})

const barVisible = computed(() =>
  Boolean(motion.value && (barActions.value.length > 0 || showDiffToggle.value)),
)

const hasPinnedActionBar = computed(() => barActions.value.some((action) => action.pinned))

const hasFabMenu = computed(() => {
  if (!barVisible.value) return false
  const menuActions = barActions.value.filter((action) => !action.pinned)
  if (menuActions.length > 0) return true
  return showDiffToggle.value && !hasPinnedActionBar.value
})

function onBarAction(id: string) {
  switch (id) {
    case 'publish':
      onPublish()
      break
    case 'deleteDraft':
      onDeleteDraft()
      break
    case 'startBallot':
      onStartBallot()
      break
    case 'archive':
      onArchiveToggle()
      break
    case 'propose':
      onStartProposal()
      break
    case 'edit':
      onStartEdit()
      break
    case 'accept-all':
      suggestionsRef.value?.acceptAll()
      break
    case 'reject-all':
      suggestionsRef.value?.rejectAll()
      break
    case 'submit':
      if (suggestionMode.value === 'propose') suggestionsRef.value?.submitProposal()
      else suggestionsRef.value?.saveReview()
      break
    case 'cancel':
      suggestionsRef.value?.cancel()
      break
  }
}
</script>

<template>
  <article v-if="motion" class="motion">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>

    <FwCard
      class="motion__box"
      :class="{
        'motion__box--with-fab': hasFabMenu,
        'motion__box--editing': isSuggestionEditing || hasPinnedActionBar,
        'motion__box--fab-menu': hasFabMenu,
      }"
    >
      <header class="motion__header">
        <div class="motion__topbar">
          <div class="motion__badges">
            <MotionStatusBadge :status="motion.status" />
            <FwBadge
              v-if="isDecided && motion.outcome"
              :tone="motion.outcome === 'accepted' ? 'primary' : 'neutral'"
            >
              <FontAwesomeIcon
                :icon="motion.outcome === 'accepted' ? 'circle-check' : 'circle-xmark'"
              />
              {{ outcomeLabel(motion.outcome) }}
            </FwBadge>
            <FwBadge tone="tertiary">{{ topicLabel(motion.topic) }}</FwBadge>
            <FwBadge v-if="motion.division?.name" tone="neutral">
              {{ motion.division.name }}
            </FwBadge>
            <FwBadge v-if="isArchived" tone="neutral">
              <FontAwesomeIcon icon="box-archive" /> Archiviert
            </FwBadge>
          </div>

          <WatchButton
            v-if="!isDraft"
            :motion-id="motion.id"
            :watched="isWatched"
            :watch-count="watchCount"
          />
        </div>

        <h1 v-if="!isAuthorEditing" class="motion__title">{{ motion.title }}</h1>
        <div v-else class="motion__header-field motion__title-edit">
          <div class="motion__header-field__layer">
            <div class="motion__header-field__mirror" aria-hidden="true">
              {{ editTitle }}<FontAwesomeIcon
                icon="pen-to-square"
                class="motion__header-field__icon"
              />
            </div>
            <textarea
              v-model="editTitle"
              class="motion__title"
              rows="1"
              :maxlength="MOTION_TITLE_MAX"
              autocomplete="off"
              aria-label="Titel"
            />
          </div>
          <span
            class="motion__field-counter"
            :class="{
              'motion__field-counter--low':
                titleDraftLength > 0 && titleDraftLength < MOTION_TITLE_MIN,
              'motion__field-counter--max': titleDraftLength >= MOTION_TITLE_MAX,
            }"
            aria-live="polite"
          >
            {{ titleDraftLength }} / {{ MOTION_TITLE_MAX }}
          </span>
        </div>

        <p v-if="!isAuthorEditing" class="motion__summary">{{ motion.summary }}</p>
        <div v-else class="motion__header-field motion__summary-edit">
          <div class="motion__header-field__layer">
            <div class="motion__header-field__mirror" aria-hidden="true">
              {{ editSummary }}<FontAwesomeIcon
                icon="pen-to-square"
                class="motion__header-field__icon"
              />
            </div>
            <textarea
              id="motion-summary-edit"
              v-model="editSummary"
              class="motion__summary"
              rows="1"
              :maxlength="MOTION_SUMMARY_MAX"
              aria-label="Kurzbeschreibung"
            />
          </div>
          <span
            class="motion__field-counter"
            :class="{
              'motion__field-counter--low':
                summaryDraftLength > 0 && summaryDraftLength < MOTION_SUMMARY_MIN,
              'motion__field-counter--max': summaryDraftLength >= MOTION_SUMMARY_MAX,
            }"
            aria-live="polite"
          >
            {{ summaryDraftLength }} / {{ MOTION_SUMMARY_MAX }}
          </span>
        </div>

        <div class="motion__meta">
          <NuxtLink
            v-if="motion.authorId && !motion.isAnonymous"
            :to="`/users/${motion.authorId}`"
            class="motion__author-link"
          >
            <FontAwesomeIcon icon="user" /> {{ motion.author?.displayName }}
          </NuxtLink>
          <span v-else>
            <FontAwesomeIcon icon="user" /> Anonym
          </span>
          <span v-if="motion.publishedAt">
            <FontAwesomeIcon icon="clock" /> Veröffentlicht am
            {{ formatDate(motion.publishedAt) }}
          </span>
          <span v-if="motion.status === 'debate' && motion.debateEndsAt">
            <FontAwesomeIcon icon="comments" />
            Debatte {{ timeRemaining(motion.debateEndsAt) }}
          </span>
          <span v-else-if="isBallot && motion.ballotEndsAt">
            <FontAwesomeIcon icon="check-to-slot" />
            Abstimmung {{ timeRemaining(motion.ballotEndsAt) }}
          </span>
        </div>

        <p v-if="publishError" class="form-error">{{ publishError }}</p>
        <p v-if="deleteError" class="form-error">{{ deleteError }}</p>
        <p v-if="ballotError" class="form-error">{{ ballotError }}</p>
        <p v-if="archiveError" class="form-error">{{ archiveError }}</p>
      </header>

      <Transition name="swap">
        <div
          v-if="!isSuggestionEditing"
          class="motion__body-area"
          :class="{ 'is-expanded': bodyExpanded }"
        >
          <div
            ref="bodyClip"
            class="motion__body-clip"
            :style="{ maxHeight: bodyMaxHeight }"
            :role="bodyExpanded ? undefined : 'button'"
            :tabindex="bodyExpanded ? undefined : 0"
            :aria-expanded="bodyExpanded"
            @click="!bodyExpanded && setBodyExpanded(true)"
            @keydown.enter.prevent="!bodyExpanded && setBodyExpanded(true)"
            @keydown.space.prevent="!bodyExpanded && setBodyExpanded(true)"
          >
            <div class="motion__body-content">
              <div class="motion__body-swap">
                <div
                  class="motion__body-layer"
                  :class="{ 'is-visible': !showSuggestionDiff }"
                  :aria-hidden="showSuggestionDiff"
                >
                  <RichText :html="motion.bodyHtml" />
                </div>
                <div
                  v-if="isDebate && suggestionCount > 0"
                  :id="`motion-body-diff-${motion.id}`"
                  class="motion__body-layer"
                  :class="{ 'is-visible': showSuggestionDiff }"
                  :aria-hidden="!showSuggestionDiff"
                />
              </div>
            </div>
            <span v-show="!bodyExpanded" class="motion__body-fade" aria-hidden="true" />
          </div>

          <button
            type="button"
            class="motion__body-toggle"
            :aria-expanded="bodyExpanded"
            @click="setBodyExpanded(!bodyExpanded)"
          >
            <FontAwesomeIcon
              :icon="bodyExpanded ? 'chevron-up' : 'chevron-down'"
              class="motion__body-chevron"
              aria-hidden="true"
            />
            {{ bodyExpanded ? 'Antragstext einklappen' : 'Antragstext lesen' }}
          </button>
        </div>
      </Transition>

      <MotionSuggestions
        v-if="!isDraft"
        ref="suggestionsRef"
        v-model:show-diff="showSuggestionDiff"
        v-model:mode="suggestionMode"
        v-model:busy="suggestionBusy"
        v-model:count="suggestionCount"
        v-model:review-pending-count="reviewPendingCount"
        :motion-id="motion.id"
        :motion-body-html="motion.bodyHtml"
        :propose-signal="proposeSignal"
        :edit-signal="editSignal"
        :title-draft="isAuthorEditing ? editTitle : undefined"
        :summary-draft="isAuthorEditing ? editSummary : undefined"
        :header-baseline="headerBaseline"
        @saved="refreshNuxtData()"
      />

      <MotionActionBar
        v-if="barVisible"
        v-model:show-diff="showSuggestionDiff"
        :actions="barActions"
        :show-diff-toggle="showDiffToggle"
        :diff-count="suggestionCount"
        @action="onBarAction"
      />
    </FwCard>

    <section v-if="isBallot || isDecided" class="motion__section">
      <h2>
        <FontAwesomeIcon icon="check-to-slot" />
        {{ isDecided ? 'Ergebnis der Abstimmung' : 'Geheime Abstimmung' }}
      </h2>
      <MotionBallot
        :motion-id="motion.id"
        :can-manage="canManageBallot"
        @changed="refreshNuxtData()"
      />
    </section>

    <section v-if="!isDraft" class="motion__section">
      <h2><FontAwesomeIcon icon="chart-pie" /> Stimmungsbild</h2>
      <MotionMood :motion-id="motion.id" :can-vote="debateOpen" />
    </section>

    <section v-if="!isDraft" class="motion__section">
      <div class="motion__section-head">
        <h2>
          <FontAwesomeIcon icon="comments" /> Debatte
          <span class="motion__history-count">{{ debatePostCount }}</span>
        </h2>
        <label v-if="debatePostCount > 0" class="motion__debate-sort">
          <span class="visually-hidden">Sortierung</span>
          <select v-model="debatePostSort">
            <option value="recent">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
        </label>
      </div>
      <MotionDebate
        v-model:post-count="debatePostCount"
        v-model:post-sort="debatePostSort"
        :motion-id="motion.id"
        :debate-open="debateOpen"
      />
    </section>

    <p v-else class="app-hint motion__hint">
      Dieser Antrag ist noch ein Entwurf. Stimmungsbild und Debatte werden mit der
      Veröffentlichung aktiviert.
    </p>
  </article>
</template>

<style scoped>
.motion {
  max-width: 820px;
  margin: 0 auto;
}
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}
.motion__topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.motion__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.motion__topbar > :last-child {
  flex-shrink: 0;
}
.motion__title {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0 0 var(--space-3);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-sans);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.25;
  box-sizing: border-box;
  overflow-wrap: break-word;
}

textarea.motion__title {
  resize: none;
  overflow: hidden;
  outline: none;
  appearance: none;
  box-shadow: none;
  field-sizing: content;
  min-height: 0;
  white-space: pre-wrap;
}

textarea.motion__title:focus,
textarea.motion__title:focus-visible {
  outline: none;
  border: none;
  box-shadow: none;
}

.motion__header-field {
  position: relative;
}

.motion__header-field__layer {
  display: grid;
  max-width: 100%;
}

.motion__header-field__mirror,
.motion__header-field__layer .motion__title,
.motion__header-field__layer .motion__summary {
  grid-area: 1 / 1;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.motion__header-field__mirror {
  color: transparent;
  pointer-events: none;
  user-select: none;
}

.motion__title-edit {
  margin: 0 0 var(--space-3);
}

.motion__title-edit .motion__header-field__mirror,
.motion__title-edit .motion__header-field__layer .motion__title {
  font-family: var(--font-sans);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.25;
}

.motion__summary-edit {
  margin: 0 0 var(--space-4);
}

.motion__summary-edit .motion__header-field__mirror,
.motion__summary-edit .motion__header-field__layer .motion__summary {
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-weight: 400;
  line-height: var(--line-height-base);
}

.motion__header-field__layer .motion__title,
.motion__header-field__layer .motion__summary {
  position: relative;
  z-index: 1;
  margin: 0;
  resize: none;
  overflow: hidden;
  background: transparent;
  field-sizing: content;
  min-height: 0;
}

.motion__header-field__icon {
  display: inline-block;
  margin-left: 0.35em;
  font-size: 0.9em;
  color: var(--color-text-muted);
  opacity: 0;
  vertical-align: baseline;
  transition: opacity 0.15s ease;
}

.motion__header-field:hover .motion__header-field__icon,
.motion__header-field:focus-within .motion__header-field__icon {
  opacity: 0.55;
}

.motion__field-counter {
  display: none;
  margin-top: var(--space-1);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.motion__header-field:focus-within .motion__field-counter {
  display: block;
}

.motion__field-counter--low {
  color: var(--color-danger);
}

.motion__field-counter--max {
  color: var(--color-accent);
}

.motion__summary {
  display: block;
  width: 100%;
  margin: 0 0 var(--space-4);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-weight: 400;
  line-height: var(--line-height-base);
  box-sizing: border-box;
}

textarea.motion__summary {
  resize: none;
  overflow: hidden;
  outline: none;
  appearance: none;
  box-shadow: none;
  field-sizing: content;
  min-height: 0;
}

textarea.motion__summary:focus,
textarea.motion__summary:focus-visible {
  outline: none;
  border: none;
  box-shadow: none;
}

.motion__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}
.motion__meta span,
.motion__author-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.motion__author-link {
  color: var(--color-text-muted);
  text-decoration: none;
}
.motion__author-link:hover {
  color: var(--color-accent);
}
.motion__box {
  margin-bottom: var(--space-6);
}

/* Keep bottom content clear of sticky pinned action bar. */
.motion__box--editing :deep(.suggestions__editor),
.motion__box--editing .motion__body-area {
  padding-bottom: calc(3.5rem + var(--space-4));
}

.motion__box--fab-menu :deep(.suggestions__lead),
.motion__box--fab-menu :deep(.suggestions__hint) {
  padding-inline-end: calc(3.5rem + var(--space-3));
}

.motion__box--with-fab :deep(.motion__body-area) {
  padding-inline-end: calc(3.5rem + var(--space-4));
}
.motion__header {
  padding-bottom: var(--space-5);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.motion__header > *:last-child {
  margin-bottom: 0;
}

.motion__body-clip {
  position: relative;
  overflow: hidden;
  transition: max-height 0.35s ease;
}

.motion__body-area:not(.is-expanded) .motion__body-clip {
  cursor: pointer;
}

.motion__body-content {
  outline: none;
  width: 100%;
}

/* Read-only motion body (RichText + suggestion diff overlay), not the edit surface. */
.motion__body-swap {
  display: grid;
  width: 100%;
}

.motion__body-layer {
  grid-area: 1 / 1;
  width: 100%;
  min-width: 0;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.motion__body-layer :deep(.rich-text),
.motion__body-layer :deep(.editor-surface) {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  line-height: 1.7;
  font-weight: inherit;
  min-height: 0;
}

.motion__body-layer.is-visible {
  opacity: 1;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .motion__body-layer {
    transition: none;
  }
}

.motion__body-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4.5rem;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-surface) 92%
  );
  pointer-events: none;
}

.motion__body-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  margin-top: var(--space-4);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.motion__body-toggle:hover {
  text-decoration: underline;
}

.motion__body-chevron {
  flex-shrink: 0;
  font-size: 0.85rem;
  transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .motion__body-clip {
    transition: none;
  }
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

.motion__history-count {
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

.motion__section {
  margin-bottom: var(--space-7);
}
.motion__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.motion__section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
}
.motion__section > h2 {
  margin-bottom: var(--space-4);
}
.motion__debate-sort select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.875rem;
}
.motion__hint {
  margin-top: var(--space-2);
}
</style>
