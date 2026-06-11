<script setup lang="ts">
import { DEFAULT_DEBATE_DAYS } from '#shared/constants'
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
const isArchived = computed(() => Boolean(motion.value?.archivedAt))
const canArchive = computed(() => isAuthor.value || isModerator.value)

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

const canSuggest = computed(() => loggedIn.value && debateOpen.value)

const showSuggestionDiff = ref(false)
const suggestionCount = ref(0)
const suggestionMode = ref<'idle' | 'propose' | 'review'>('idle')
const suggestionBusy = ref(false)
const suggestionsRef = ref<{
  startReview: () => void
  cancel: () => void
  submitProposal: () => void | Promise<void>
  saveReview: () => void | Promise<void>
} | null>(null)
const isSuggestionEditing = computed(() => suggestionMode.value !== 'idle')

// Reactive trigger: incrementing it tells MotionSuggestions to enter propose mode.
const proposeSignal = ref(0)

function onStartProposal() {
  proposeSignal.value += 1
}

useHead({ title: () => `${motion.value?.title ?? 'Antrag'} — FreiWerk` })

const COLLAPSED_BODY_HEIGHT = '11rem'
const bodyExpanded = ref(false)
const bodyClip = ref<HTMLElement | null>(null)
const bodyMaxHeight = ref<string>(COLLAPSED_BODY_HEIGHT)
let bodyResetTimer: ReturnType<typeof setTimeout> | null = null

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

// All motion-related actions in priority order; the bar shows as many inline as fit.
const barActions = computed<MotionBarAction[]>(() => {
  const m = motion.value
  if (!m) return []

  if (isSuggestionEditing.value) {
    const proposing = suggestionMode.value === 'propose'
    const submitLabel = proposing
      ? suggestionBusy.value
        ? 'Senden ...'
        : 'Vorschlag senden'
      : suggestionBusy.value
        ? 'Speichern ...'
        : 'Speichern'
    return [
      {
        id: 'submit',
        label: submitLabel,
        icon: proposing ? 'paper-plane' : 'floppy-disk',
        variant: 'primary',
        disabled: suggestionBusy.value,
      },
      {
        id: 'cancel',
        label: 'Abbrechen',
        variant: 'ghost',
        disabled: suggestionBusy.value,
      },
    ]
  }

  const actions: MotionBarAction[] = []

  if (isDraft.value && isAuthor.value) {
    actions.push({
      id: 'publish',
      label: publishPending.value ? 'Veröffentlichen ...' : 'Veröffentlichen',
      icon: 'paper-plane',
      variant: 'primary',
      disabled: publishPending.value,
    })
    actions.push({
      id: 'edit',
      label: 'Entwurf bearbeiten',
      icon: 'pen-to-square',
      to: `/motions/${m.id}/edit`,
      variant: 'ghost',
    })
  }

  if (!isDraft.value && isAuthor.value && suggestionCount.value > 0 && debateOpen.value) {
    actions.push({ id: 'review', label: 'Vorschläge prüfen', icon: 'check', variant: 'primary' })
  }

  if (canSuggest.value) {
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

const showDiffToggle = computed(() => !isSuggestionEditing.value && suggestionCount.value > 0)

const barVisible = computed(() =>
  Boolean(motion.value && (barActions.value.length > 0 || showDiffToggle.value)),
)

function onBarAction(id: string) {
  switch (id) {
    case 'publish':
      onPublish()
      break
    case 'archive':
      onArchiveToggle()
      break
    case 'propose':
      onStartProposal()
      break
    case 'review':
      suggestionsRef.value?.startReview()
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

    <FwCard class="motion__box">
      <header class="motion__header">
        <div class="motion__topbar">
          <div class="motion__badges">
            <MotionStatusBadge :status="motion.status" />
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

        <h1 class="motion__title">{{ motion.title }}</h1>
        <p class="motion__summary">{{ motion.summary }}</p>

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
        </div>

        <p v-if="publishError" class="form-error">{{ publishError }}</p>
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
                  v-if="suggestionCount > 0"
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
        :motion-id="motion.id"
        :motion-body-html="motion.bodyHtml"
        :propose-signal="proposeSignal"
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
  margin: 0 0 var(--space-3);
  font-size: 2rem;
}
.motion__summary {
  font-size: 1.15rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-4);
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
}

.motion__body-swap {
  display: grid;
}

.motion__body-layer {
  grid-area: 1 / 1;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
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
