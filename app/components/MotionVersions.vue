<script setup lang="ts">
import type { MotionVersionItem } from '../../shared/types'

const props = defineProps<{ motionId: string }>()

const { data, pending } = await useFetch(
  () => `/api/motions/${props.motionId}/versions`,
  { key: computed(() => `versions-${props.motionId}`) },
)

const versions = computed<MotionVersionItem[]>(
  () => (data.value?.versions ?? []) as MotionVersionItem[],
)

const expanded = ref<string | null>(null)

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}
</script>

<template>
  <div class="versions">
    <p v-if="pending" class="versions__loading">Versionen werden geladen ...</p>

    <p v-else-if="versions.length === 0" class="versions__empty">
      Für diesen Antrag liegt noch keine Versionshistorie vor.
    </p>

    <ol v-else class="versions__list">
      <li v-for="version in versions" :key="version.id" class="versions__item">
        <div class="versions__head">
          <div class="versions__title">
            <FwBadge tone="tertiary">Version {{ version.versionNumber }}</FwBadge>
            <span class="versions__name">{{ version.title }}</span>
          </div>
          <div class="versions__meta">
            <span>
              <FontAwesomeIcon icon="clock" /> {{ formatDate(version.createdAt) }}
            </span>
            <span v-if="version.createdByName">
              <FontAwesomeIcon icon="user" /> {{ version.createdByName }}
            </span>
          </div>
        </div>

        <p class="versions__summary">{{ version.summary }}</p>

        <button
          type="button"
          class="versions__toggle"
          :aria-expanded="expanded === version.id"
          @click="toggle(version.id)"
        >
          <FontAwesomeIcon
            :icon="expanded === version.id ? 'chevron-up' : 'chevron-down'"
            aria-hidden="true"
          />
          {{ expanded === version.id ? 'Antragstext einklappen' : 'Antragstext ansehen' }}
        </button>

        <div v-if="expanded === version.id" class="versions__body">
          <RichText :html="version.bodyHtml" />
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.versions__loading,
.versions__empty {
  color: var(--color-text-muted);
}
.versions__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.versions__item {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.versions__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.versions__title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
}
.versions__name {
  font-weight: 600;
}
.versions__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.versions__meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.versions__summary {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
}
.versions__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.versions__toggle:hover {
  text-decoration: underline;
}
.versions__body {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
</style>
