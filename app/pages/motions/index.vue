<script setup lang="ts">
import type { MotionListItem, MotionListResponse } from '#shared/types'
import {
  TOPICS,
  TOPIC_LABELS,
  MOTION_STATUS_LABELS,
  type Topic,
} from '#shared/constants'

type ActiveFilterKey =
  | 'status'
  | 'topic'
  | 'divisionId'
  | 'authorId'
  | 'publishedFrom'
  | 'publishedTo'
  | 'minSupport'
  | 'watched'
  | 'ballotPending'
  | 'archived'

type SortValue =
  | 'recent'
  | 'active'
  | 'controversial'
  | 'popular'
  | 'unpopular'
  | 'mostWatched'

const SORT_OPTIONS: { value: SortValue; label: string; icon: string }[] = [
  { value: 'recent', label: 'Neueste', icon: 'clock' },
  { value: 'active', label: 'Aktivste', icon: 'fire' },
  { value: 'popular', label: 'Populärste', icon: 'thumbs-up' },
  { value: 'unpopular', label: 'Unpopulärste', icon: 'thumbs-down' },
  { value: 'mostWatched', label: 'Meist gemerkt', icon: 'star' },
  { value: 'controversial', label: 'Kontroverseste', icon: 'down-left-and-up-right-to-center' },
]

type ActiveFilterChip = {
  key: ActiveFilterKey
  label: string
}

useHead({ title: 'Anträge — FreiWerk' })

const route = useRoute()
const router = useRouter()
const { user } = useAuthUser()

function queryRecordFromRoute(
  query: typeof route.query,
): Record<string, string> {
  const result: Record<string, string> = {}
  if (typeof query.q === 'string' && query.q) result.q = query.q
  if (typeof query.status === 'string' && query.status) result.status = query.status
  if (typeof query.topic === 'string' && query.topic) result.topic = query.topic
  if (typeof query.divisionId === 'string' && query.divisionId) {
    result.divisionId = query.divisionId
  }
  if (typeof query.authorId === 'string' && query.authorId) {
    result.authorId = query.authorId
  }
  if (typeof query.sort === 'string' && query.sort && query.sort !== 'recent') {
    result.sort = query.sort
  }
  if (typeof query.publishedFrom === 'string' && query.publishedFrom) {
    result.publishedFrom = query.publishedFrom
  }
  if (typeof query.publishedTo === 'string' && query.publishedTo) {
    result.publishedTo = query.publishedTo
  }
  if (typeof query.minSupport === 'string' && query.minSupport) {
    result.minSupport = query.minSupport
  }
  if (query.watched === 'true') result.watched = 'true'
  if (query.ballotPending === 'true') result.ballotPending = 'true'
  if (query.archived === 'true') result.archived = 'true'
  return result
}

function queryRecordFromFilters(): Record<string, string> {
  const result: Record<string, string> = {}
  if (filters.q) result.q = filters.q
  if (filters.status) result.status = filters.status
  if (filters.topic) result.topic = filters.topic
  if (filters.divisionId) result.divisionId = filters.divisionId
  if (filters.authorId) result.authorId = filters.authorId
  if (filters.sort && filters.sort !== 'recent') result.sort = filters.sort
  if (filters.publishedFrom) result.publishedFrom = filters.publishedFrom
  if (filters.publishedTo) result.publishedTo = filters.publishedTo
  if (filters.minSupport) result.minSupport = filters.minSupport
  if (filters.watched) result.watched = 'true'
  if (filters.ballotPending) result.ballotPending = 'true'
  if (filters.archived) result.archived = 'true'
  return result
}

function serializeQuery(query: Record<string, string>): string {
  return Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&')
}

function applyRouteQuery(query: typeof route.query) {
  filters.q = typeof query.q === 'string' ? query.q : ''
  filters.status = typeof query.status === 'string' ? query.status : ''
  filters.topic = typeof query.topic === 'string' ? query.topic : ''
  filters.divisionId =
    typeof query.divisionId === 'string' ? query.divisionId : ''
  filters.authorId = typeof query.authorId === 'string' ? query.authorId : ''
  filters.sort =
    typeof query.sort === 'string' && query.sort ? query.sort : 'recent'
  filters.publishedFrom =
    typeof query.publishedFrom === 'string' ? query.publishedFrom : ''
  filters.publishedTo =
    typeof query.publishedTo === 'string' ? query.publishedTo : ''
  filters.minSupport =
    typeof query.minSupport === 'string' ? query.minSupport : ''
  filters.watched = query.watched === 'true'
  filters.ballotPending = query.ballotPending === 'true'
  filters.archived = query.archived === 'true'
}

const filters = reactive({
  q: (route.query.q as string) ?? '',
  status: (route.query.status as string) ?? '',
  topic: (route.query.topic as string) ?? '',
  divisionId: (route.query.divisionId as string) ?? '',
  authorId: (route.query.authorId as string) ?? '',
  sort: (route.query.sort as string) ?? 'recent',
  publishedFrom: (route.query.publishedFrom as string) ?? '',
  publishedTo: (route.query.publishedTo as string) ?? '',
  minSupport: (route.query.minSupport as string) ?? '',
  watched: route.query.watched === 'true',
  ballotPending: route.query.ballotPending === 'true',
  archived: route.query.archived === 'true',
})

watch(
  () => route.query,
  (query) => {
    if (
      serializeQuery(queryRecordFromRoute(query)) !==
      serializeQuery(queryRecordFromFilters())
    ) {
      applyRouteQuery(query)
    }
  },
)

watch(
  () => [
    filters.q,
    filters.status,
    filters.topic,
    filters.divisionId,
    filters.authorId,
    filters.sort,
    filters.publishedFrom,
    filters.publishedTo,
    filters.minSupport,
    filters.watched,
    filters.ballotPending,
    filters.archived,
  ] as const,
  () => {
    const nextQuery = queryRecordFromFilters()
    if (
      serializeQuery(nextQuery) !==
      serializeQuery(queryRecordFromRoute(route.query))
    ) {
      router.replace({ path: '/motions', query: nextQuery })
    }
  },
)

const filtersOpen = ref(
  Boolean(
    filters.status
    || filters.topic
    || filters.divisionId
    || filters.publishedFrom
    || filters.publishedTo
    || filters.minSupport
    || filters.watched
    || filters.ballotPending
    || filters.archived,
  ),
)

const sortOpen = ref(false)
const sortMenuRef = ref<HTMLElement | null>(null)

const currentSortOption = computed(
  () => SORT_OPTIONS.find((option) => option.value === filters.sort) ?? SORT_OPTIONS[0]!,
)

const { data: divisionData } = await useFetch('/api/divisions')

const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []

  if (filters.status) {
    chips.push({
      key: 'status',
      label: MOTION_STATUS_LABELS[filters.status] ?? filters.status,
    })
  }

  if (filters.topic) {
    const topic = filters.topic as Topic
    chips.push({
      key: 'topic',
      label: TOPIC_LABELS[topic] ?? filters.topic,
    })
  }

  if (filters.divisionId) {
    const division = divisionData.value?.divisions?.find(
      (d) => d.id === filters.divisionId,
    )
    chips.push({
      key: 'divisionId',
      label: division?.name ?? filters.divisionId,
    })
  }

  if (filters.publishedFrom) {
    chips.push({
      key: 'publishedFrom',
      label: `Ab ${formatDateLabel(filters.publishedFrom)}`,
    })
  }
  if (filters.publishedTo) {
    chips.push({
      key: 'publishedTo',
      label: `Bis ${formatDateLabel(filters.publishedTo)}`,
    })
  }
  if (filters.minSupport) {
    chips.push({
      key: 'minSupport',
      label: `Mind. ${filters.minSupport}% Zustimmung`,
    })
  }
  if (filters.watched) {
    chips.push({ key: 'watched', label: 'Beobachtet' })
  }
  if (filters.ballotPending) {
    chips.push({ key: 'ballotPending', label: 'Noch abzustimmen' })
  }
  if (filters.archived) {
    chips.push({ key: 'archived', label: 'Archiv' })
  }

  if (filters.authorId) {
    chips.push({
      key: 'authorId',
      label:
        filters.authorId === user.value?.id
          ? 'Meine Anträge'
          : (user.value?.displayName ?? 'Autor'),
    })
  }

  return chips
})

const activeFilterCount = computed(() => activeFilterChips.value.length)

const apiQuery = computed(() => {
  const q: Record<string, string> = {}
  if (filters.q) q.q = filters.q
  if (filters.status) q.status = filters.status
  if (filters.topic) q.topic = filters.topic
  if (filters.divisionId) q.divisionId = filters.divisionId
  if (filters.authorId) q.authorId = filters.authorId
  if (filters.sort) q.sort = filters.sort
  if (filters.publishedFrom) q.publishedFrom = filters.publishedFrom
  if (filters.publishedTo) q.publishedTo = filters.publishedTo
  if (filters.minSupport) q.minSupport = filters.minSupport
  if (filters.watched) q.watched = 'true'
  if (filters.ballotPending) q.ballotPending = 'true'
  if (filters.archived) q.archived = 'true'
  return q
})

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

const { data, pending } = await useFetch<MotionListResponse>('/api/motions', {
  query: apiQuery,
  key: 'motions-list',
})

const motions = computed<MotionListItem[]>(
  () => (data.value?.motions ?? []) as MotionListItem[],
)
const totalMotions = computed(() => data.value?.total ?? 0)

const hasLoadedOnce = ref(false)
watch(
  data,
  (value) => {
    if (value != null) hasLoadedOnce.value = true
  },
  { immediate: true },
)

const isInitialLoad = computed(() => pending.value && !hasLoadedOnce.value)
const isRefreshing = computed(() => pending.value && hasLoadedOnce.value)

function selectSort(value: SortValue) {
  filters.sort = value
  sortOpen.value = false
}

function toggleFilters() {
  filtersOpen.value = !filtersOpen.value
  if (filtersOpen.value) sortOpen.value = false
}

function toggleSort() {
  sortOpen.value = !sortOpen.value
  if (sortOpen.value) filtersOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!sortOpen.value || !sortMenuRef.value) return
  if (!sortMenuRef.value.contains(event.target as Node)) {
    sortOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function clearFilter(key: ActiveFilterKey) {
  if (key === 'watched' || key === 'ballotPending' || key === 'archived') {
    filters[key] = false
    return
  }
  filters[key] = ''
}

function resetFilters() {
  filters.status = ''
  filters.topic = ''
  filters.divisionId = ''
  filters.publishedFrom = ''
  filters.publishedTo = ''
  filters.minSupport = ''
  filters.watched = false
  filters.ballotPending = false
  filters.archived = false
}
</script>

<template>
  <div class="page">
    <div class="page__head">
      <h1>
        Anträge
        <span v-if="hasLoadedOnce" class="page__count">{{ totalMotions }}</span>
      </h1>
    </div>

    <FwCard class="filters">
      <div class="filters__bar">
        <div class="filters__search">
          <FontAwesomeIcon icon="magnifying-glass" />
          <input
            v-model="filters.q"
            type="search"
            placeholder="Anträge durchsuchen ..."
            aria-label="Anträge durchsuchen"
          >
        </div>

        <div ref="sortMenuRef" class="sort-menu">
          <button
            class="filters__toggle sort-menu__trigger"
            type="button"
            :aria-label="`Sortierung: ${currentSortOption.label}`"
            :aria-expanded="sortOpen"
            aria-controls="motion-sort-panel"
            @click.stop="toggleSort"
          >
            <FontAwesomeIcon :icon="currentSortOption.icon" class="sort-menu__option-icon" />
            <span class="sort-menu__trigger-label">{{ currentSortOption.label }}</span>
            <FontAwesomeIcon icon="chevron-down" class="sort-menu__chevron" aria-hidden="true" />
          </button>
          <div
            v-show="sortOpen"
            id="motion-sort-panel"
            class="sort-menu__panel"
            role="menu"
          >
            <button
              v-for="option in SORT_OPTIONS"
              :key="option.value"
              type="button"
              class="sort-menu__item"
              :class="{ 'sort-menu__item--active': filters.sort === option.value }"
              role="menuitemradio"
              :aria-checked="filters.sort === option.value"
              @click="selectSort(option.value)"
            >
              <FontAwesomeIcon :icon="option.icon" class="sort-menu__option-icon" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <button
          class="filters__toggle"
          type="button"
          aria-label="Filter"
          :aria-expanded="filtersOpen"
          aria-controls="motion-filters-panel"
          @click="toggleFilters"
        >
          <FontAwesomeIcon icon="filter" class="filters__toggle-icon" />
          <span v-if="activeFilterCount > 0" class="filters__badge">{{ activeFilterCount }}</span>
        </button>
      </div>

      <div v-if="activeFilterChips.length > 0" class="filters__active">
        <span
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="filters__chip"
        >
          <span class="filters__chip-label">{{ chip.label }}</span>
          <button
            type="button"
            class="filters__chip-remove"
            :aria-label="`Filter „${chip.label}“ entfernen`"
            @click="clearFilter(chip.key)"
          >
            <FontAwesomeIcon icon="xmark" />
          </button>
        </span>
      </div>

      <div
        v-show="filtersOpen"
        id="motion-filters-panel"
        class="filters__panel"
      >
        <div class="filters__row">
          <label class="field">
            <span>Status</span>
            <select v-model="filters.status">
              <option value="">Alle</option>
              <option
                v-for="(label, status) in MOTION_STATUS_LABELS"
                :key="status"
                :value="status"
              >
                {{ label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Themengebiet</span>
            <select v-model="filters.topic">
              <option value="">Alle</option>
              <option v-for="t in TOPICS" :key="t" :value="t">{{ TOPIC_LABELS[t] }}</option>
            </select>
          </label>

          <label class="field">
            <span>Gliederungsebene</span>
            <select v-model="filters.divisionId">
              <option value="">Alle</option>
              <option v-for="d in divisionData?.divisions ?? []" :key="d.id" :value="d.id">
                {{ d.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Veröffentlicht ab</span>
            <input v-model="filters.publishedFrom" type="date">
          </label>

          <label class="field">
            <span>Veröffentlicht bis</span>
            <input v-model="filters.publishedTo" type="date">
          </label>

          <label class="field">
            <span>Min. Zustimmung</span>
            <select v-model="filters.minSupport">
              <option value="">Alle</option>
              <option value="25">Mind. 25%</option>
              <option value="50">Mind. 50%</option>
              <option value="75">Mind. 75%</option>
            </select>
          </label>

          <FwButton variant="ghost" class="filters__reset" @click="resetFilters">
            Zurücksetzen
          </FwButton>
        </div>

        <div class="filters__toggles">
          <label class="filters__check">
            <input v-model="filters.watched" type="checkbox">
            <span><FontAwesomeIcon icon="star" /> Nur beobachtete</span>
          </label>
          <label class="filters__check">
            <input v-model="filters.archived" type="checkbox">
            <span><FontAwesomeIcon icon="box-archive" /> Archiv anzeigen</span>
          </label>
        </div>
      </div>
    </FwCard>

    <section class="results" :aria-busy="pending || undefined">
      <p v-if="isInitialLoad" class="results__loading muted">Lade Anträge …</p>

      <div
        v-else
        class="results__panel"
        :class="{ 'results__panel--refreshing': isRefreshing }"
      >
        <TransitionGroup
          v-if="motions.length > 0"
          name="motion-grid"
          tag="div"
          class="grid"
        >
          <MotionCard
            v-for="m in motions"
            :key="m.id"
            :motion="m"
            :highlight-query="filters.q"
          />
        </TransitionGroup>

        <Transition v-else name="results-empty">
          <FwCard v-if="!pending" key="empty" class="empty">
            <p>Keine Anträge gefunden. Passe die Filter an oder stelle einen neuen Antrag.</p>
          </FwCard>
        </Transition>

        <Transition name="results-status">
          <p
            v-if="isRefreshing && motions.length === 0"
            key="searching"
            class="results__status muted"
            aria-live="polite"
          >
            Suche …
          </p>
        </Transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}
.page__head h1 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
}
.page__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.1rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.filters {
  margin-bottom: var(--space-5);
}

.filters__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--space-3);
}

.filters__toggle {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.12s ease;
}

.filters__toggle-icon {
  font-size: 1.2rem;
}

.filters__toggle:hover {
  transform: translateY(-1px);
  background: var(--color-bg);
}

.sort-menu {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-self: stretch;
}

.sort-menu__trigger {
  width: auto;
  height: 100%;
  justify-content: flex-start;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  font-weight: 600;
  white-space: nowrap;
}

.sort-menu__trigger-label {
  font-size: 0.9rem;
}

.sort-menu__chevron {
  margin-left: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sort-menu__trigger .sort-menu__option-icon {
  width: 1.1rem;
  flex-shrink: 0;
  font-size: 1rem;
}

.sort-menu__trigger .sort-menu__option-icon :deep(svg) {
  width: 1em;
  height: 1em;
}

.sort-menu__panel {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 20;
  min-width: 13rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.sort-menu__item {
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
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.sort-menu__item:hover {
  background: var(--color-bg);
  color: var(--color-accent);
}

.sort-menu__item--active {
  background: var(--color-bg);
  color: var(--color-accent);
}

.sort-menu__item .sort-menu__option-icon {
  width: 1.5rem;
  flex-shrink: 0;
  font-size: 1.2rem;
  text-align: center;
}

.sort-menu__item .sort-menu__option-icon :deep(svg) {
  width: 1.15em;
  height: 1.15em;
}

.filters__badge {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: 0.75rem;
  font-weight: 700;
}

.filters__active {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.filters__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
  line-height: 1.2;
}

.filters__chip-label {
  padding: 0 var(--space-1);
}

.filters__chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.filters__chip-remove:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.filters__panel {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.filters__search {
  display: flex;
  flex: 1;
  min-width: min(100%, 220px);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
}
.filters__search input {
  border: none;
  flex: 1;
  padding: var(--space-2) 0;
  background: transparent;
  color: var(--color-text);
}
.filters__search input::placeholder {
  color: color-mix(in srgb, var(--color-text) 42%, transparent);
}
.filters__search input:focus {
  outline: none;
  box-shadow: none;
}
.filters__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  align-items: end;
}
.filters__reset {
  height: fit-content;
}
.filters__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.filters__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  cursor: pointer;
}
.filters__check input {
  width: auto;
  margin: 0;
}
.filters__check span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  position: relative;
}
.results {
  position: relative;
}
.results__loading {
  margin: 0;
}
.results__panel {
  position: relative;
  transition: opacity 0.25s ease;
}
.results__panel--refreshing {
  opacity: 0.78;
}
.results__status {
  margin: var(--space-4) 0 0;
  text-align: center;
}

.motion-grid-enter-active {
  transition: opacity 0.32s ease, transform 0.32s ease;
}
.motion-grid-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.motion-grid-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
.motion-grid-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
.motion-grid-move {
  transition: transform 0.35s ease;
}

.results-empty-enter-active,
.results-empty-leave-active,
.results-status-enter-active,
.results-status-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.results-empty-enter-from,
.results-empty-leave-to,
.results-status-enter-from,
.results-status-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .results__panel,
  .motion-grid-enter-active,
  .motion-grid-leave-active,
  .motion-grid-move,
  .results-empty-enter-active,
  .results-empty-leave-active,
  .results-status-enter-active,
  .results-status-leave-active {
    transition: none;
  }
  .motion-grid-enter-from,
  .motion-grid-leave-to,
  .results-empty-enter-from,
  .results-empty-leave-to,
  .results-status-enter-from,
  .results-status-leave-to {
    transform: none;
  }
}

.muted {
  color: var(--color-text-muted);
}
</style>
