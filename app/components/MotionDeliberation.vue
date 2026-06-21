<script setup lang="ts">
// Tabbed container for a motion's deliberation views: arguments, Q&A, resources
// and a chronological activity feed.
defineProps<{ motionId: string; debateOpen: boolean }>()

type TabId = 'arguments' | 'questions' | 'resources' | 'activity'

interface DeliberationTab {
  id: TabId
  label: string
  icon: string
}

const tabs: DeliberationTab[] = [
  { id: 'arguments', label: 'Argumente', icon: 'scale-balanced' },
  { id: 'questions', label: 'Fragen & Antworten', icon: 'circle-question' },
  { id: 'resources', label: 'Ressourcen', icon: 'paperclip' },
  { id: 'activity', label: 'Verlauf', icon: 'clock-rotate-left' },
]

const active = ref<TabId>('arguments')
</script>

<template>
  <div class="delib">
    <nav v-if="tabs.length > 1" class="delib__tabs" aria-label="Deliberation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="delib__tab"
        :class="{ 'is-active': active === tab.id }"
        @click="active = tab.id"
      >
        <FontAwesomeIcon :icon="tab.icon" /> {{ tab.label }}
      </button>
    </nav>

    <div class="delib__panel">
      <ArgumentList
        v-if="active === 'arguments'"
        :motion-id="motionId"
        :debate-open="debateOpen"
      />
      <QuestionList
        v-else-if="active === 'questions'"
        :motion-id="motionId"
        :debate-open="debateOpen"
      />
      <ResourceList
        v-else-if="active === 'resources'"
        :motion-id="motionId"
        :debate-open="debateOpen"
      />
      <ActivityFeed v-else-if="active === 'activity'" :motion-id="motionId" />
    </div>
  </div>
</template>

<style scoped>
.delib__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.delib__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.delib__tab:hover {
  color: var(--color-text);
}
.delib__tab.is-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
</style>
