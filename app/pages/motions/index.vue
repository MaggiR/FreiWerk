<script setup lang="ts">
import type { MotionListItem } from '../../../shared/types'
import {
  TOPICS,
  TOPIC_LABELS,
  MOTION_STATUS_LABELS,
  type Topic,
} from '../../../shared/constants'

type ActiveFilterKey = 'status' | 'topic' | 'divisionId' | 'sort' | 'authorId'

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
}

const filters = reactive({
  q: (route.query.q as string) ?? '',
  status: (route.query.status as string) ?? '',
  topic: (route.query.topic as string) ?? '',
  divisionId: (route.query.divisionId as string) ?? '',
  authorId: (route.query.authorId as string) ?? '',
  sort: (route.query.sort as string) ?? 'recent',
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
  Boolean(filters.status || filters.topic || filters.divisionId || filters.sort === 'active'),
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

  if (filters.sort === 'active') {
    chips.push({
      key: 'sort',
      label: 'Aktivste',
    })
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
  return q
})

const { data, pending } = await useFetch('/api/motions', {
  query: apiQuery,
  key: 'motions-list',
})

const motions = computed<MotionListItem[]>(
  () => (data.value?.motions ?? []) as MotionListItem[],
)

function clearFilter(key: ActiveFilterKey) {
  if (key === 'sort') {
    filters.sort = 'recent'
    return
  }
  filters[key] = ''
}

function resetFilters() {
  filters.q = ''
  filters.status = ''
  filters.topic = ''
  filters.divisionId = ''
  filters.authorId = ''
  filters.sort = 'recent'
}
</script>

<template>
  <div class="page">
    <div class="page__head">
      <h1>Anträge</h1>
      <NuxtLink to="/motions/new">
        <FwButton variant="primary">
          <FontAwesomeIcon icon="plus" /> Antrag stellen
        </FwButton>
      </NuxtLink>
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

        <button
          class="filters__toggle"
          type="button"
          aria-label="Filter"
          :aria-expanded="filtersOpen"
          aria-controls="motion-filters-panel"
          @click="filtersOpen = !filtersOpen"
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
              <option value="debate">Debatte</option>
              <option value="decided">Entschieden</option>
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
            <span>Sortierung</span>
            <select v-model="filters.sort">
              <option value="recent">Neueste</option>
              <option value="active">Aktivste</option>
            </select>
          </label>

          <FwButton variant="ghost" class="filters__reset" @click="resetFilters">
            Zurücksetzen
          </FwButton>
        </div>
      </div>
    </FwCard>

    <p v-if="pending" class="muted">Lade Anträge ...</p>
    <div v-else-if="motions.length > 0" class="grid">
      <MotionCard v-for="m in motions" :key="m.id" :motion="m" />
    </div>
    <FwCard v-else class="empty">
      <p>Keine Anträge gefunden. Passe die Filter an oder stelle einen neuen Antrag.</p>
    </FwCard>
  </div>
</template>

<style scoped>
.page__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
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
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
.muted {
  color: var(--color-text-muted);
}
</style>
