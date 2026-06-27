<script setup lang="ts">
import type { MotionViewId } from '#shared/constants'

type ViewTab = Exclude<MotionViewId, 'antrag' | 'ballot' | 'versions'>

const props = withDefaults(
  defineProps<{
    view: ViewTab
    motionId: string
    motionVersion?: number | null
    debateOpen: boolean
    canModerate?: boolean
    currentUserId?: string | null
    /** Activity feed: panel height in split view, endless scroll in single-column view. */
    activityLayout?: 'panel' | 'endless'
    mobileDebateFullscreen?: boolean
  }>(),
  { activityLayout: 'panel', mobileDebateFullscreen: false },
)

const emit = defineEmits<{
  'close-debate': []
  'open-motion': []
}>()

const debatePostCount = defineModel<number>('debatePostCount', { default: 0 })
const debatePostSort = defineModel<'recent' | 'oldest'>('debatePostSort', { default: 'oldest' })

const sortMode = ref<'top' | 'recent'>('top')
const showSortMenu = computed(
  () => props.view === 'arguments' || props.view === 'questions',
)

const questionListRef = ref<{
  openAskForm: () => void
  askLabel: string
} | null>(null)
const resourceListRef = ref<{
  openSuggestForm: () => void
  suggestLabel: string
} | null>(null)

const argumentItemCount = defineModel<number>('argumentItemCount', { default: 0 })
const questionItemCount = defineModel<number>('questionItemCount', { default: 0 })
const resourceItemCount = defineModel<number>('resourceItemCount', { default: 0 })

const headingCount = computed(() => {
  if (props.view === 'arguments') return argumentItemCount.value
  if (props.view === 'questions') return questionItemCount.value
  if (props.view === 'resources') return resourceItemCount.value
  return undefined
})

watch(
  () => props.view,
  () => {
    sortMode.value = 'top'
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="tab-view"
    :class="{
      'tab-view--debate-dock': view === 'debate',
      'tab-view--debate-fullscreen': view === 'debate' && mobileDebateFullscreen,
      'tab-view--activity-dock': view === 'activity' && activityLayout === 'panel',
    }"
  >
    <div class="tab-view__head">
      <button
        v-if="view === 'debate' && mobileDebateFullscreen"
        type="button"
        class="tab-view__back"
        @click="emit('close-debate')"
      >
        <FontAwesomeIcon icon="arrow-left" aria-hidden="true" />
        Zurück
      </button>
      <MotionViewHeading :view="view" :count="headingCount" />
      <div
        v-if="showSortMenu || (debateOpen && (view === 'questions' || view === 'resources'))"
        class="tab-view__head-actions"
      >
        <TabViewHeadButton
          v-if="debateOpen && view === 'questions'"
          :label="questionListRef?.askLabel ?? 'Frage stellen'"
          icon="plus"
          @click="questionListRef?.openAskForm()"
        />
        <TabViewHeadButton
          v-if="debateOpen && view === 'resources'"
          :label="resourceListRef?.suggestLabel ?? 'Ressource vorschlagen'"
          icon="plus"
          @click="resourceListRef?.openSuggestForm()"
        />
        <DeliberationSortMenu
          v-if="showSortMenu"
          v-model="sortMode"
          :top-label="view === 'questions' ? 'Upvotes' : 'Zustimmung'"
        />
      </div>
    </div>

    <ArgumentList
      v-if="view === 'arguments'"
      v-model:item-count="argumentItemCount"
      v-model:sort-mode="sortMode"
      :motion-id="motionId"
      :debate-open="debateOpen"
    />
    <MotionMood
      v-else-if="view === 'mood'"
      :motion-id="motionId"
      :can-vote="debateOpen"
    />
    <QuestionList
      v-else-if="view === 'questions'"
      ref="questionListRef"
      v-model:item-count="questionItemCount"
      v-model:sort-mode="sortMode"
      :motion-id="motionId"
      :debate-open="debateOpen"
    />
    <ResourceList
      v-else-if="view === 'resources'"
      ref="resourceListRef"
      v-model:item-count="resourceItemCount"
      :motion-id="motionId"
      :debate-open="debateOpen"
    />
    <div v-else-if="view === 'debate'" class="tab-view__panel">
      <MotionDebate
        v-model:post-count="debatePostCount"
        v-model:post-sort="debatePostSort"
        :motion-id="motionId"
        :motion-version="motionVersion"
        :debate-open="debateOpen"
        :can-moderate="canModerate"
        :current-user-id="currentUserId ?? null"
      />
    </div>
    <div v-else-if="view === 'activity'" class="tab-view__panel tab-view__panel--activity">
      <ActivityFeed
        :motion-id="motionId"
        :layout="activityLayout"
        @open-motion="emit('open-motion')"
      />
    </div>
  </div>
</template>

<style scoped>
.tab-view {
  container-type: inline-size;
  container-name: tab-view;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: min(32rem, 70vh);
}
.tab-view--debate-dock {
  min-height: min(32rem, 70vh);
}
.tab-view--debate-fullscreen {
  min-height: 100%;
  height: 100%;
}
.tab-view--debate-fullscreen .tab-view__panel {
  flex: 1;
  min-height: 0;
}
.tab-view__back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.tab-view__back:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.tab-view--debate-dock .tab-view__head {
  flex-shrink: 0;
}
.tab-view--debate-dock .tab-view__panel {
  flex: 1;
  min-height: 0;
}
@media (max-width: 1023px) {
  .tab-view--debate-dock {
    min-height: min(32rem, 70vh);
  }
  .tab-view--debate-fullscreen {
    min-height: 100%;
    height: 100%;
  }
}
.tab-view__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.tab-view__head :deep(.motion-view-heading) {
  flex: 1;
  min-width: 0;
  margin: 0;
}
.tab-view__head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.tab-view__panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-view__panel :deep(.chat) {
  flex: 1;
  min-height: 0;
}
.tab-view__panel--activity {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-view__panel--activity :deep(.activity--panel) {
  flex: 1;
  min-height: 0;
}
/* Match deliberation lists (args/mood): react to pane width, not viewport. */
@container tab-view (max-width: 559px) {
  .tab-view__head {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .tab-view__head :deep(.motion-view-heading) {
    flex: none;
    width: 100%;
  }
  .tab-view__head-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
    gap: var(--space-2);
  }
  .tab-view__head-actions :deep(.tab-view-head-btn) {
    padding: 0.4rem var(--space-3);
    font-size: 0.78rem;
    max-width: 100%;
  }
  .tab-view__head-actions :deep(.tab-view-head-btn span) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@media (max-width: 1023px) {
  @container tab-view (max-width: 559px) {
    .tab-view__head :deep(.motion-view-heading) {
      font-size: 1.25rem;
      line-height: 1.2;
    }
  }
}
@media (min-width: 1024px) {
  .tab-view__head :deep(.motion-view-heading) {
    font-size: 1.5rem;
    line-height: 1.25;
  }
}
@media (min-width: 1024px) {
  .tab-view {
    min-height: 0;
    height: 100%;
  }
  .tab-view--activity-dock .tab-view__head {
    flex-shrink: 0;
  }
  .tab-view--activity-dock .tab-view__panel--activity {
    flex: 1;
    min-height: 0;
  }
}
</style>
