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

const activeId = ref<string | null>(null)

const activeVersion = computed(
  () => versions.value.find((version) => version.id === activeId.value) ?? null,
)

watch(
  versions,
  (list) => {
    if (list.length === 0) {
      activeId.value = null
      return
    }
    if (!list.some((version) => version.id === activeId.value)) {
      activeId.value = list[0]!.id
    }
  },
  { immediate: true },
)

function selectTab(id: string) {
  activeId.value = id
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  const last = versions.value.length - 1
  let next = index

  if (event.key === 'ArrowRight') next = index < last ? index + 1 : 0
  else if (event.key === 'ArrowLeft') next = index > 0 ? index - 1 : last
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  else return

  event.preventDefault()
  const version = versions.value[next]
  if (!version) return
  selectTab(version.id)
  document.getElementById(`version-tab-${version.id}`)?.focus()
}
</script>

<template>
  <div class="versions" lang="de">
    <p v-if="pending" class="versions__loading">Versionen werden geladen ...</p>

    <p v-else-if="versions.length === 0" class="versions__empty">
      Für diesen Antrag liegt noch keine Versionshistorie vor.
    </p>

    <div v-else class="versions__tabs">
      <div class="versions__tablist" role="tablist" aria-label="Antragsversionen">
        <button
          v-for="(version, index) in versions"
          :id="`version-tab-${version.id}`"
          :key="version.id"
          type="button"
          class="versions__tab"
          :class="{ 'is-active': activeId === version.id }"
          role="tab"
          :aria-selected="activeId === version.id"
          :aria-controls="`version-panel-${version.id}`"
          :tabindex="activeId === version.id ? 0 : -1"
          @click="selectTab(version.id)"
          @keydown="onTabKeydown($event, index)"
        >
          Version {{ version.versionNumber }}
        </button>
      </div>

      <section
        v-if="activeVersion"
        :id="`version-panel-${activeVersion.id}`"
        class="versions__panel"
        role="tabpanel"
        :aria-labelledby="`version-tab-${activeVersion.id}`"
      >
        <header class="versions__head">
          <h2 class="versions__title">{{ activeVersion.title }}</h2>
          <div class="versions__meta">
            <span>
              <FontAwesomeIcon icon="clock" />
              <RelativeTime :value="activeVersion.createdAt" />
            </span>
            <span v-if="activeVersion.createdByName">
              <FontAwesomeIcon icon="user" /> {{ activeVersion.createdByName }}
            </span>
          </div>
        </header>

        <p class="versions__summary">{{ activeVersion.summary }}</p>

        <div class="versions__body">
          <RichText :html="activeVersion.bodyHtml" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.versions__loading,
.versions__empty {
  color: var(--color-text-muted);
}

.versions__tablist {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
  scrollbar-width: thin;
}

.versions__tab {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease, border-color 0.18s ease;
}

.versions__tab:hover {
  color: var(--color-text);
}

.versions__tab.is-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.versions__tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.versions__panel {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.versions__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.versions__title {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.35;
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

.versions__body {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}
</style>
