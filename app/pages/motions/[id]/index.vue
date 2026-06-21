<script setup lang="ts">
import {
  DEFAULT_DEBATE_DAYS,
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
  MOTION_VIEW_META,
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
const versionUpdatedAt = computed(
  () => data.value?.versionUpdatedAt ?? motion.value?.updatedAt ?? null,
)

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

function onStartEdit() {
  editSignal.value += 1
}
const publishError = ref('')
const deletePending = ref(false)
const deleteError = ref('')
const draftBusy = computed(() => publishPending.value || deletePending.value)
const ballotPending = ref(false)
const ballotError = ref('')
const debatePostCount = ref(0)
const debatePostSort = ref<'recent' | 'oldest'>('oldest')
const debateLastSeenCount = ref<number | null>(null)
const reportOpen = ref(false)

// ---- Tabs ----
type MainTab = 'antrag' | 'arguments' | 'mood' | 'questions' | 'resources'
type PanelTab = 'debate' | 'activity'
type ViewTab = MainTab | PanelTab

const SPLIT_MIN = 0.3
const SPLIT_MAX = 0.7
const SPLIT_BREAKPOINT = 1024

const activeMainTab = ref<MainTab>('antrag')
const activePanelTab = ref<PanelTab>('debate')
const mobileActiveView = ref<ViewTab>('antrag')
/** Mobile-first default keeps SSR/hydration aligned; syncLayoutMode sets wide on desktop. */
const isWideLayout = ref(false)
const mainVisible = ref(true)
const panelVisible = ref(true)

const mainTabs = computed(() => {
  const ids: MainTab[] = ['antrag']
  if (!isDraft.value) {
    ids.push('arguments', 'questions', 'mood', 'resources')
  }
  return ids.map((id) => ({ id, ...MOTION_VIEW_META[id] }))
})

const panelTabs = (['debate', 'activity'] as const).map((id) => ({
  id,
  ...MOTION_VIEW_META[id],
}))

function isMainTab(id: ViewTab): id is MainTab {
  return id !== 'debate' && id !== 'activity'
}

function isTabActive(id: ViewTab): boolean {
  if (!isWideLayout.value) return mobileActiveView.value === id
  if (isMainTab(id)) return mainVisible.value && activeMainTab.value === id
  return panelVisible.value && activePanelTab.value === id
}

function onTabClick(id: ViewTab) {
  if (!isWideLayout.value) {
    if (mobileActiveView.value !== id) mobileActiveView.value = id
    return
  }

  if (isMainTab(id)) {
    if (activeMainTab.value === id && mainVisible.value) {
      if (panelVisible.value) mainVisible.value = false
    } else {
      activeMainTab.value = id
      mainVisible.value = true
    }
    return
  }

  if (activePanelTab.value === id && panelVisible.value) {
    if (mainVisible.value) panelVisible.value = false
  } else {
    activePanelTab.value = id
    panelVisible.value = true
  }
}

const showMainPane = computed(() => {
  if (isDraft.value) return true
  if (isWideLayout.value) return mainVisible.value
  return isMainTab(mobileActiveView.value)
})

const showPanelPane = computed(() => {
  if (isDraft.value) return false
  if (isWideLayout.value) return panelVisible.value
  return !isMainTab(mobileActiveView.value)
})

const visibleMainTab = computed<MainTab>(() => {
  if (!isWideLayout.value && isMainTab(mobileActiveView.value)) {
    return mobileActiveView.value
  }
  return activeMainTab.value
})

const visiblePanelTab = computed<PanelTab>(() => {
  if (!isWideLayout.value && !isMainTab(mobileActiveView.value)) {
    return mobileActiveView.value
  }
  return activePanelTab.value
})

const debateSeenStorageKey = computed(() => `freiwerk-debate-seen-${id}`)

const isDebateViewActive = computed(() => {
  if (isDraft.value) return false
  if (!isWideLayout.value) return mobileActiveView.value === 'debate'
  return showPanelPane.value && activePanelTab.value === 'debate'
})

const isStackedDebateView = computed(
  () => isDebateViewActive.value && !isWideLayout.value,
)

const tabsRef = ref<HTMLElement | null>(null)
const tabsOffsetPx = ref(0)
let tabsResizeObserver: ResizeObserver | null = null

const stackedDebateDockStyle = computed(() => {
  if (!isStackedDebateView.value || tabsOffsetPx.value <= 0) return undefined
  return { '--motion-tabs-offset': `${tabsOffsetPx.value}px` }
})

function syncTabsOffset() {
  if (!import.meta.client) return
  tabsOffsetPx.value = tabsRef.value?.offsetHeight ?? 0
}

function setupTabsObserver() {
  if (!import.meta.client) return
  syncTabsOffset()
  tabsResizeObserver?.disconnect()
  tabsResizeObserver = new ResizeObserver(() => syncTabsOffset())
  if (tabsRef.value) tabsResizeObserver.observe(tabsRef.value)
}

const debateUnreadCount = computed(() => {
  if (isDebateViewActive.value) return 0
  if (debateLastSeenCount.value === null) return 0
  return Math.max(0, debatePostCount.value - debateLastSeenCount.value)
})

function markDebateSeen() {
  debateLastSeenCount.value = debatePostCount.value
  if (import.meta.client) {
    sessionStorage.setItem(debateSeenStorageKey.value, String(debatePostCount.value))
  }
}

function loadDebateSeenCount() {
  if (!import.meta.client) return
  const stored = sessionStorage.getItem(debateSeenStorageKey.value)
  if (stored === null) return
  const parsed = Number(stored)
  if (Number.isFinite(parsed)) debateLastSeenCount.value = parsed
}

watch(isDebateViewActive, (active) => {
  if (active) markDebateSeen()
}, { immediate: true })

watch(debatePostCount, () => {
  if (isDebateViewActive.value) markDebateSeen()
})

let layoutMedia: MediaQueryList | null = null

function syncLayoutMode() {
  if (!import.meta.client) return
  const wide =
    layoutMedia?.matches ?? window.innerWidth >= SPLIT_BREAKPOINT
  if (wide === isWideLayout.value) return

  if (!wide) {
    mobileActiveView.value = !mainVisible.value && panelVisible.value
      ? activePanelTab.value
      : activeMainTab.value
  } else if (isMainTab(mobileActiveView.value)) {
    activeMainTab.value = mobileActiveView.value
    mainVisible.value = true
  } else {
    activePanelTab.value = mobileActiveView.value
    panelVisible.value = true
  }

  isWideLayout.value = wide
  nextTick(syncTabsOffset)
}

const splitLeftStyle = computed(() => {
  if (
    !isWideLayout.value ||
    !showMainPane.value ||
    !showPanelPane.value ||
    dragMainCollapsed.value ||
    dragPanelCollapsed.value
  ) {
    return undefined
  }
  return { '--split-left': leftBasis.value }
})

// Editing a suggestion only makes sense on the motion text tab.
watch(isSuggestionEditing, (editing) => {
  if (!editing) return
  activeMainTab.value = 'antrag'
  mobileActiveView.value = 'antrag'
})

// ---- Resizable split (motion content | side panel) ----
const splitRef = ref<HTMLElement | null>(null)
const splitRatio = ref(0.6)
const dragging = ref(false)
// Ratio shown live while dragging (already magnet-snapped); committed on release.
const dragRatio = ref(0.6)
// True while the pointer sits in a snap zone, so the divider eases to its target.
const snapping = ref(false)

const displayRatio = computed(() => (dragging.value ? dragRatio.value : splitRatio.value))

// While dragging past the collapse threshold, hide the pane via opacity instead of
// squashing its flex-basis to 0 (which distorts content).
const dragMainCollapsed = computed(() => dragging.value && dragRatio.value <= 0)
const dragPanelCollapsed = computed(() => dragging.value && dragRatio.value >= 1)

const leftBasis = computed(() => {
  const ratio = displayRatio.value
  if (dragging.value && ratio <= 0) {
    return `${(SPLIT_MIN * 100).toFixed(2)}%`
  }
  if (dragging.value && ratio >= 1) {
    return `${(SPLIT_MAX * 100).toFixed(2)}%`
  }
  return `${(ratio * 100).toFixed(2)}%`
})

// Past the 30/70 marks the divider no longer tracks the pointer 1:1. Instead it
// magnet-snaps: a short overshoot eases back to the mark, a larger one collapses
// the now-too-small column to the edge. The midpoint between mark and edge decides.
function snapRatio(raw: number): number {
  if (raw < SPLIT_MIN) {
    return raw < SPLIT_MIN / 2 ? 0 : SPLIT_MIN
  }
  if (raw > SPLIT_MAX) {
    return raw > (SPLIT_MAX + 1) / 2 ? 1 : SPLIT_MAX
  }
  return raw
}

function onDividerMove(event: PointerEvent) {
  const el = splitRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const raw = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  snapping.value = raw < SPLIT_MIN || raw > SPLIT_MAX
  dragRatio.value = snapRatio(raw)
}

function onDividerUp() {
  dragging.value = false
  snapping.value = false
  window.removeEventListener('pointermove', onDividerMove)
  window.removeEventListener('pointerup', onDividerUp)

  const final = dragRatio.value
  if (final <= 0) {
    mainVisible.value = false
    splitRatio.value = 0.6
  } else if (final >= 1) {
    panelVisible.value = false
    splitRatio.value = 0.6
  } else {
    splitRatio.value = final
  }
}

function onDividerDown(event: PointerEvent) {
  if (!isWideLayout.value || !showMainPane.value || !showPanelPane.value) return
  dragRatio.value = splitRatio.value
  snapping.value = false
  dragging.value = true
  event.preventDefault()
  window.addEventListener('pointermove', onDividerMove)
  window.addEventListener('pointerup', onDividerUp)
}

onMounted(() => {
  loadDebateSeenCount()
  layoutMedia = window.matchMedia(`(min-width: ${SPLIT_BREAKPOINT}px)`)
  layoutMedia.addEventListener('change', syncLayoutMode)
  syncLayoutMode()
  window.addEventListener('resize', syncTabsOffset)
  nextTick(setupTabsObserver)
})

onUnmounted(() => {
  layoutMedia?.removeEventListener('change', syncLayoutMode)
  window.removeEventListener('resize', syncTabsOffset)
  window.removeEventListener('pointermove', onDividerMove)
  window.removeEventListener('pointerup', onDividerUp)
  tabsResizeObserver?.disconnect()
})

watch(isStackedDebateView, () => nextTick(syncTabsOffset))
watch(isDraft, () => nextTick(setupTabsObserver))

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

  if (isDecided.value || isArchived.value) {
    actions.push({
      id: 'beschluss',
      label: 'Beschlussdokument',
      icon: 'file-lines',
      to: `/motions/${m.id}/beschluss`,
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

  if (loggedIn.value && !isAuthor.value && !isDraft.value) {
    actions.push({
      id: 'report',
      label: 'Antrag melden',
      icon: 'flag',
      variant: 'ghost',
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
    case 'report':
      reportOpen.value = true
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
  <article
    v-if="motion"
    class="motion"
    :class="{
      'motion--wide': !isDraft,
      'motion--stacked-debate': isStackedDebateView,
    }"
    :style="stackedDebateDockStyle"
  >
    <header class="motion__head">
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

    <nav v-if="!isDraft" ref="tabsRef" class="motion__tabs">
      <div class="motion__tabs-row">
        <button
          v-for="tab in mainTabs"
          :key="tab.id"
          type="button"
          class="motion__tab"
          :class="{ 'is-active': isTabActive(tab.id) }"
          @click="onTabClick(tab.id)"
        >
          <FontAwesomeIcon :icon="tab.icon" /> {{ tab.label }}
        </button>
        <span class="motion__tabs-spacer" aria-hidden="true" />
        <button
          v-for="tab in panelTabs"
          :key="tab.id"
          type="button"
          class="motion__tab motion__tab--panel"
          :class="{ 'is-active': isTabActive(tab.id) }"
          @click="onTabClick(tab.id)"
        >
          <FontAwesomeIcon :icon="tab.icon" /> {{ tab.label }}
          <span
            v-if="tab.id === 'debate' && debateUnreadCount > 0"
            class="motion__tab-count"
          >{{ debateUnreadCount }}</span>
        </button>
      </div>
    </nav>

    <div
      ref="splitRef"
      class="motion__split"
      :class="{
        'motion__split--stacked': !isWideLayout,
        'is-panel-hidden': isDraft || dragPanelCollapsed || !showPanelPane,
        'is-main-hidden': dragMainCollapsed || !showMainPane,
        'is-dragging': dragging,
        'is-snapping': snapping,
      }"
    >
      <!-- Draft: no tabs, no animation -->
      <div v-if="isDraft" class="motion__pane motion__pane--left">
        <div class="motion__tabpanel">
          <MotionViewHeading view="antrag" />
          <FwCard
            class="motion__box"
            :class="{
              'motion__box--editing': isSuggestionEditing || hasPinnedActionBar,
              'motion__box--fab-menu': hasFabMenu,
            }"
          >
            <Transition name="swap">
              <div v-if="!isSuggestionEditing" class="motion__body-area">
                <div class="motion__body-content">
                  <RichText :html="motion.bodyHtml" />
                </div>
              </div>
            </Transition>
            <div
              v-if="versionUpdatedAt && !isSuggestionEditing"
              class="motion__body-version-bar"
            >
              <MotionBodyVersion
                :version="motion.currentVersion"
                :updated-at="versionUpdatedAt"
              />
            </div>
            <MotionActionBar
              v-if="barVisible"
              v-model:show-diff="showSuggestionDiff"
              :actions="barActions"
              :show-diff-toggle="showDiffToggle"
              :diff-count="suggestionCount"
              @action="onBarAction"
            />
          </FwCard>
          <p class="app-hint motion__hint">
            Dieser Antrag ist noch ein Entwurf. Argumente, Stimmungsbild und Debatte
            werden mit der Veröffentlichung aktiviert.
          </p>
        </div>
      </div>

      <!-- Mobile / tablet: one view at a time with transition -->
      <Transition v-else-if="!isWideLayout" name="tab-panel" mode="out-in">
        <div :key="mobileActiveView" class="motion__animated-view">
          <div v-if="mobileActiveView === 'antrag'" class="motion__tabpanel">
            <MotionViewHeading view="antrag" />
            <FwCard
              class="motion__box"
              :class="{
                'motion__box--editing': isSuggestionEditing || hasPinnedActionBar,
                'motion__box--fab-menu': hasFabMenu,
              }"
            >
              <Transition name="swap">
                <div v-if="!isSuggestionEditing" class="motion__body-area">
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
                </div>
              </Transition>
              <MotionSuggestions
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
              <div
                v-if="versionUpdatedAt && !isSuggestionEditing"
                class="motion__body-version-bar"
              >
                <MotionBodyVersion
                  :version="motion.currentVersion"
                  :updated-at="versionUpdatedAt"
                />
              </div>
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
          </div>
          <MotionTabView
            v-else
            :view="mobileActiveView"
            v-model:debate-post-count="debatePostCount"
            v-model:debate-post-sort="debatePostSort"
            :motion-id="motion.id"
            :motion-version="motion.currentVersion"
            :debate-open="debateOpen"
            :can-moderate="isModerator"
            :current-user-id="user?.id ?? null"
            activity-layout="endless"
          />
        </div>
      </Transition>

      <!-- Desktop: resizable split with per-pane transitions -->
      <template v-else>
      <div
        class="motion__pane motion__pane--left"
        :style="splitLeftStyle"
        :aria-hidden="!showMainPane || dragMainCollapsed"
        :inert="(!showMainPane || dragMainCollapsed) || undefined"
      >
        <!-- Antrag stays mounted so suggestion editing survives tab switches. -->
        <div
          v-show="visibleMainTab === 'antrag'"
          class="motion__tabpanel motion__tabpanel--persistent"
        >
          <MotionViewHeading view="antrag" />
          <FwCard
            class="motion__box"
            :class="{
              'motion__box--editing': isSuggestionEditing || hasPinnedActionBar,
              'motion__box--fab-menu': hasFabMenu,
            }"
          >
            <Transition name="swap">
              <div v-if="!isSuggestionEditing" class="motion__body-area">
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
              </div>
            </Transition>

            <MotionSuggestions
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

            <div
              v-if="versionUpdatedAt && !isSuggestionEditing"
              class="motion__body-version-bar"
            >
              <MotionBodyVersion
                :version="motion.currentVersion"
                :updated-at="versionUpdatedAt"
              />
            </div>

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
        </div>

        <Transition name="tab-panel" mode="out-in">
          <div
            v-if="visibleMainTab !== 'antrag'"
            :key="visibleMainTab"
            class="motion__tabpanel"
          >
            <MotionTabView
              :view="visibleMainTab"
              v-model:debate-post-count="debatePostCount"
              v-model:debate-post-sort="debatePostSort"
              :motion-id="motion.id"
              :motion-version="motion.currentVersion"
              :debate-open="debateOpen"
              :can-moderate="isModerator"
              :current-user-id="user?.id ?? null"
            />
          </div>
        </Transition>
      </div>

      <div
        class="motion__divider"
        :class="{
          'motion__divider--hidden':
            !showMainPane || !showPanelPane || dragMainCollapsed || dragPanelCollapsed,
        }"
        aria-hidden="true"
        @pointerdown="onDividerDown"
      >
        <span class="motion__divider-grip" />
      </div>

      <aside
        class="motion__pane motion__pane--right"
        :aria-hidden="!showPanelPane || dragPanelCollapsed"
        :inert="(!showPanelPane || dragPanelCollapsed) || undefined"
      >
        <Transition name="tab-panel" mode="out-in">
          <div :key="visiblePanelTab" class="panel">
            <MotionTabView
              :view="visiblePanelTab"
              v-model:debate-post-count="debatePostCount"
              v-model:debate-post-sort="debatePostSort"
              :motion-id="motion.id"
              :motion-version="motion.currentVersion"
              :debate-open="debateOpen"
              :can-moderate="isModerator"
              :current-user-id="user?.id ?? null"
              activity-layout="panel"
            />
          </div>
        </Transition>
      </aside>
      </template>
    </div>

    <ReportModal
      v-model:open="reportOpen"
      target-type="motion"
      :target-id="motion.id"
      @reported="reportOpen = false"
    />
  </article>
</template>

<style scoped>
.motion {
  max-width: 880px;
  margin: 0 auto;
}
.motion--wide {
  max-width: 1320px;
}
.motion__head {
  margin-bottom: var(--space-4);
}

/* ---- Tab bar (chips) ---- */
.motion__tabs {
  margin-bottom: var(--space-5);
}
.motion__tabs-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  /* Tab chips have horizontal padding; pull row left so icons align with meta row. */
  width: calc(100% + var(--space-3));
  margin-left: calc(-1 * var(--space-3));
}
.motion__tabs-spacer {
  flex: 1 1 auto;
  min-width: var(--space-2);
}
@media (max-width: 1023px) {
  .motion__tabs-spacer {
    display: none;
  }
}
.motion__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.motion__tab:hover:not(.is-active) {
  color: var(--color-text);
}
.motion__tab.is-active {
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface));
  color: var(--color-accent);
}
.motion__tab--panel.is-active {
  background: color-mix(in srgb, var(--color-tertiary) 14%, var(--color-surface));
  color: var(--color-tertiary);
}
.motion__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.3rem;
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, currentColor 16%, transparent);
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Stacked layout: debate chat docks under tabs and fills the viewport. */
@media (max-width: 1023px) {
  .motion--stacked-debate .motion__tabs {
    position: sticky;
    top: var(--header-total-height);
    z-index: 25;
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    background: var(--color-bg);
  }

  .motion--stacked-debate .motion__animated-view :deep(.tab-view--debate-dock) {
    position: sticky;
    top: calc(var(--header-total-height) + var(--motion-tabs-offset, 2.75rem));
    display: flex;
    flex-direction: column;
    height: calc(
      100dvh - var(--header-total-height) - var(--motion-tabs-offset, 2.75rem) -
        var(--space-8)
    );
    min-height: min(20rem, 60dvh);
    min-width: 0;
  }
}

/* ---- Resizable split (motion views | side panel) ---- */
.motion__split {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.motion__split--stacked {
  gap: 0;
}
/* Fallback if layout JS has not run yet: never show the side panel below 1024px. */
@media (max-width: 1023px) {
  .motion__split:not(.motion__split--stacked) .motion__pane--right {
    display: none;
  }
}
.motion__pane {
  min-width: 0;
}
.motion__pane--left {
  width: 100%;
}
.motion__pane--right {
  width: 100%;
  height: min(32rem, 70vh);
}
.motion__split--stacked .motion__pane--right {
  height: auto;
  min-height: min(32rem, 70vh);
}
.motion__tabpanel {
  min-width: 0;
}
.motion__animated-view {
  min-width: 0;
}
.motion__tabpanel--persistent {
  animation: tab-panel-in 0.28s ease;
}
.motion__divider {
  display: none;
}
.motion__divider-grip {
  width: 4px;
  height: 3.5rem;
  border-radius: var(--radius-pill);
  background: var(--color-border);
  transition: background 0.15s ease;
}

@media (min-width: 1024px) {
  .motion__split:not(.motion__split--stacked) {
    flex-direction: row;
    align-items: stretch;
    gap: 0;
  }
  .motion__pane--left,
  .motion__pane--right {
    transition:
      flex 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.24s ease,
      min-width 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .motion__pane--left {
    overflow-x: clip;
    overflow-y: visible;
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
  }
  .motion__split:not(.is-panel-hidden):not(.is-main-hidden) .motion__pane--left {
    flex: 0 0 var(--split-left, 60%);
    min-width: 30%;
  }
  .motion__split.is-main-hidden .motion__pane--left,
  .motion__split.is-panel-hidden .motion__pane--right {
    flex: 0 0 0 !important;
    width: 0 !important;
    min-width: 0 !important;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }
  .motion__split.is-main-hidden:not(.is-panel-hidden) .motion__pane--right {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
  }
  .motion__split.is-panel-hidden:not(.is-main-hidden) .motion__pane--left {
    flex: 1 1 100% !important;
    max-width: 100%;
    min-width: 0;
  }
  .motion__pane--right {
    flex: 1 1 0;
    min-width: 0;
    align-self: flex-start;
    position: sticky;
    top: calc(var(--header-total-height) + var(--space-4));
    height: calc(100vh - var(--header-total-height) - var(--space-6));
    min-height: 24rem;
  }
  .motion__split:not(.is-panel-hidden):not(.is-main-hidden) .motion__pane--right {
    min-width: 30%;
  }
  /* While dragging, JS owns the clamping/snapping, so drop the min-width floors
     that would otherwise stop the divider from tracking the pointer. */
  .motion__split.is-dragging .motion__pane--left,
  .motion__split.is-dragging .motion__pane--right {
    min-width: 0;
  }
  /* Free 30–70% range: flex tracks the pointer 1:1. */
  .motion__split.is-dragging:not(.is-snapping):not(.is-main-hidden):not(.is-panel-hidden)
    .motion__pane--left,
  .motion__split.is-dragging:not(.is-snapping):not(.is-main-hidden):not(.is-panel-hidden)
    .motion__pane--right {
    transition: opacity 0.24s ease;
  }
  /* Snap zone (both panes still visible): magnetic ease on the divider position. */
  .motion__split.is-dragging.is-snapping:not(.is-main-hidden):not(.is-panel-hidden)
    .motion__pane--left {
    transition:
      flex-basis 0.18s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.24s ease;
  }
  /* Collapse threshold crossed while dragging: shrink faded pane, expand sibling. */
  .motion__split.is-dragging.is-main-hidden .motion__pane--left,
  .motion__split.is-dragging.is-panel-hidden .motion__pane--right {
    transition:
      flex 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.24s ease,
      min-width 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .motion__split.is-dragging.is-main-hidden:not(.is-panel-hidden) .motion__pane--right,
  .motion__split.is-dragging.is-panel-hidden:not(.is-main-hidden) .motion__pane--left {
    transition:
      flex 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.24s ease;
  }
  .motion__pane--right .panel {
    height: 100%;
    min-height: 0;
  }
  .motion__divider {
    flex: 0 0 auto;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-4);
    cursor: col-resize;
    touch-action: none;
    overflow: hidden;
    transition:
      width 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.2s ease;
  }
  .motion__divider--hidden {
    width: 0;
    opacity: 0;
    pointer-events: none;
  }
  .motion__split.is-dragging:not(.is-main-hidden):not(.is-panel-hidden) .motion__divider {
    transition: none;
  }
  .motion__divider:hover .motion__divider-grip,
  .motion__split.is-dragging .motion__divider-grip {
    background: var(--color-accent);
  }
  .motion__split.is-dragging {
    user-select: none;
  }
}

@media (min-width: 1024px) and (prefers-reduced-motion: reduce) {
  .motion__pane--left,
  .motion__pane--right,
  .motion__divider {
    transition: none;
  }
  .motion__split.is-dragging.is-snapping:not(.is-main-hidden):not(.is-panel-hidden)
    .motion__pane--left,
  .motion__split.is-dragging.is-main-hidden .motion__pane--left,
  .motion__split.is-dragging.is-main-hidden:not(.is-panel-hidden) .motion__pane--right,
  .motion__split.is-dragging.is-panel-hidden .motion__pane--right,
  .motion__split.is-dragging.is-panel-hidden:not(.is-main-hidden) .motion__pane--left {
    transition: none;
  }
}

/* ---- Side panel (Debatte / Aktivität) ---- */
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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
  display: flex;
  flex-direction: column;
}

.motion__box--editing {
  --motion-editing-bar-reserve: 6.5rem;
}

.motion__body-version-bar {
  margin-top: auto;
  padding-top: var(--space-1);
  align-self: stretch;
}

.motion__box--fab-menu .motion__body-version-bar {
  padding-inline-end: calc(3.5rem + var(--space-4));
}

@media (min-width: 1024px) {
  .motion__tabpanel--persistent {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - var(--header-total-height) - var(--space-8));
  }

  .motion__tabpanel--persistent > .motion__box {
    flex: 1;
  }
}

/* Keep bottom content clear of sticky pinned action bar / FAB. */
.motion__box--editing :deep(.suggestions__editor),
.motion__box--editing .motion__body-area,
.motion__box--fab-menu .motion__body-area {
  padding-bottom: var(--motion-editing-bar-reserve, calc(0.875rem + var(--space-1)));
}

.motion__box--fab-menu:not(.motion__box--editing) :deep(.suggestions__lead),
.motion__box--fab-menu:not(.motion__box--editing) :deep(.suggestions__hint) {
  padding-inline-end: calc(3.5rem + var(--space-3));
}

.motion__box--editing :deep(.suggestions__lead),
.motion__box--editing :deep(.suggestions__hint) {
  position: relative;
  z-index: 1;
  max-width: 100%;
}

.motion__header {
  padding-bottom: var(--space-5);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.motion__header > *:last-child {
  margin-bottom: 0;
}

.motion__body-content {
  outline: none;
  width: 100%;
}

.motion__body-content :deep(.rich-text > :last-child:not(ul):not(ol)) {
  margin-bottom: calc(var(--space-3) * 0.25);
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

/* Tab panel cross-fade + slide */
.tab-panel-enter-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}
.tab-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.tab-panel-enter-from {
  opacity: 0;
  transform: translateY(0.65rem);
}
.tab-panel-leave-to {
  opacity: 0;
  transform: translateY(-0.45rem);
}
@keyframes tab-panel-in {
  from {
    opacity: 0;
    transform: translateY(0.45rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tab-panel-enter-active,
  .tab-panel-leave-active {
    transition: none;
  }
  .motion__tabpanel--persistent {
    animation: none;
  }
}

.motion__section {
  margin-top: var(--space-6);
}
.motion__section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
}
.motion__hint {
  margin-top: var(--space-4);
}
</style>
