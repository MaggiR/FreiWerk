<script setup lang="ts">
import { MOTION_VIEW_META, type MotionViewId } from '#shared/constants'

type ViewTab = Exclude<MotionViewId, 'antrag' | 'ballot' | 'versions'>

const props = withDefaults(
  defineProps<{
    view: ViewTab
    motionId: string
    motionTitle?: string
    motionVersion?: number | null
    debateOpen: boolean
    canModerate?: boolean
    currentUserId?: string | null
    /** Activity feed: panel height in split view, endless scroll in single-column view. */
    activityLayout?: 'panel' | 'endless'
    mobileDebateFullscreen?: boolean
  }>(),
  {
    motionTitle: '',
    activityLayout: 'panel',
    mobileDebateFullscreen: false,
  },
)

const emit = defineEmits<{
  'close-debate': []
  'open-motion': []
}>()

const debateViewMeta = MOTION_VIEW_META.debate
const debateFullscreenHead = computed(
  () => props.view === 'debate' && props.mobileDebateFullscreen,
)

const debatePostCount = defineModel<number>('debatePostCount', { default: 0 })
const debatePostSort = defineModel<'recent' | 'oldest'>('debatePostSort', { default: 'oldest' })
const debateShowThreads = ref(true)

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
const questionItemCount = ref(0)
const resourceItemCount = defineModel<number>('resourceItemCount', { default: 0 })

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
    <div
      class="tab-view__head"
      :class="{ 'tab-view__head--debate-fullscreen': debateFullscreenHead }"
    >
      <button
        v-if="debateFullscreenHead"
        type="button"
        class="tab-view__back"
        aria-label="Zurück"
        @click="emit('close-debate')"
      >
        <FontAwesomeIcon icon="arrow-left" aria-hidden="true" />
      </button>
      <div v-if="debateFullscreenHead" class="tab-view__head-main">
        <h2 class="tab-view__debate-label">
          <FontAwesomeIcon :icon="debateViewMeta.icon" aria-hidden="true" />
          {{ debateViewMeta.label }}
        </h2>
        <p v-if="motionTitle" class="tab-view__motion-title">{{ motionTitle }}</p>
      </div>
      <MotionViewHeading v-else :view="view" />
      <div
        v-if="debateFullscreenHead"
        class="tab-view__head-actions tab-view__head-actions--debate-menu"
      >
        <DebateChatOptionsMenu
          v-model:post-sort="debatePostSort"
          v-model:show-threads="debateShowThreads"
          variant="header"
          vertical-icon
        />
      </div>
      <div
        v-else-if="showSortMenu || (debateOpen && (view === 'questions' || view === 'resources'))"
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
        v-model:show-threads="debateShowThreads"
        :motion-id="motionId"
        :motion-version="motionVersion"
        :debate-open="debateOpen"
        :can-moderate="canModerate"
        :current-user-id="currentUserId ?? null"
        :menu-in-header="debateFullscreenHead"
        :upvote-in-context-menu="debateFullscreenHead"
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
  min-height: 0;
  height: 100%;
  flex: 1 1 auto;
}
.tab-view--debate-fullscreen {
  position: relative;
  min-height: 100%;
  height: 100%;
  padding-inline: var(--space-3);
  box-sizing: border-box;
  --debate-dock-head-offset: calc(3.75rem + var(--space-4));
}
.tab-view--debate-fullscreen .tab-view__panel {
  flex: 1;
  min-height: 0;
}
.tab-view--debate-fullscreen .tab-view__panel :deep(.chat__scroll) {
  padding-top: var(--debate-dock-head-offset);
}
.tab-view--debate-fullscreen .tab-view__panel :deep(.chat__sticky-date) {
  top: var(--debate-dock-head-offset);
  z-index: 5;
}
.tab-view__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  font-size: 1.1rem;
  cursor: pointer;
}
.tab-view__back:hover {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  color: var(--color-accent);
}
.tab-view__head--debate-fullscreen {
  position: absolute;
  top: var(--space-2);
  left: 0;
  right: 0;
  z-index: 10;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
}
.tab-view__head-main {
  flex: 1;
  min-width: 0;
}
.tab-view__debate-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text);
}
.tab-view__debate-label svg {
  flex-shrink: 0;
  font-size: 0.95em;
  color: currentColor;
}
.tab-view__motion-title {
  margin: 0.2rem 0 0;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-view--debate-dock .tab-view__head {
  flex-shrink: 0;
}
.tab-view--debate-dock .tab-view__panel {
  flex: 1;
  min-height: 0;
}
@media (max-width: 1023px) {
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
.tab-view__head-actions--debate-menu {
  margin-left: auto;
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
  .tab-view__head:not(.tab-view__head--debate-fullscreen) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .tab-view__head:not(.tab-view__head--debate-fullscreen) :deep(.motion-view-heading) {
    flex: none;
    width: 100%;
  }
  .tab-view__head:not(.tab-view__head--debate-fullscreen) .tab-view__head-actions {
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
    .tab-view__head:not(.tab-view__head--debate-fullscreen) :deep(.motion-view-heading) {
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
