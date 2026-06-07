<script setup lang="ts">
import type { MotionListItem } from '../../../shared/types'
import { TOPICS, TOPIC_LABELS } from '../../../shared/constants'

useHead({ title: 'Anträge — FreiWerk' })

const route = useRoute()

const filters = reactive({
  q: (route.query.q as string) ?? '',
  status: (route.query.status as string) ?? '',
  topic: (route.query.topic as string) ?? '',
  divisionId: (route.query.divisionId as string) ?? '',
  authorId: (route.query.authorId as string) ?? '',
  sort: (route.query.sort as string) ?? 'recent',
})

const { data: divisionData } = await useFetch('/api/divisions')

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

function resetFilters() {
  filters.q = ''
  filters.status = ''
  filters.topic = ''
  filters.divisionId = ''
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
      <div class="filters__search">
        <FontAwesomeIcon icon="magnifying-glass" />
        <input v-model="filters.q" type="search" placeholder="Anträge durchsuchen ..." >
      </div>

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
          <FontAwesomeIcon icon="filter" /> Zurücksetzen
        </FwButton>
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
.filters__search {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  margin-bottom: var(--space-4);
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
