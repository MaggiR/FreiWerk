<script setup lang="ts">
import type { ActivityItem, ActivityListResponse } from '#shared/types'
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from '#shared/constants'
import {
  activityDeliberationTarget,
  isActivityTargetClickable,
} from '~/utils/activityNavigation'

const props = withDefaults(
  defineProps<{
    motionId: string
    /** panel: fixed-height scroll area (split view); endless: page scroll + load more */
    layout?: 'panel' | 'endless'
  }>(),
  { layout: 'panel' },
)

const emit = defineEmits<{
  'open-motion': []
}>()

const { navigateTo: navigateToDeliberation } = useDeliberationNav()

const PAGE_SIZE = 25

const events = ref<ActivityItem[]>([])
const nextCursor = ref<string | null>(null)
const pending = ref(true)
const loadingMore = ref(false)
const loadError = ref('')

const scrollRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function detail(event: ActivityItem): string {
  const meta = event.metadata
  if (meta && typeof meta.title === 'string') return meta.title
  return ''
}

function openTarget(event: ActivityItem) {
  if (!isActivityTargetClickable(event)) return
  const deliberationTarget = activityDeliberationTarget(event)
  if (deliberationTarget) {
    navigateToDeliberation(deliberationTarget)
    return
  }
  if (event.targetType === 'motion') {
    emit('open-motion')
  }
}

async function fetchPage(cursor?: string): Promise<ActivityListResponse> {
  return $fetch<ActivityListResponse>(`/api/motions/${props.motionId}/activity`, {
    query: {
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    },
  })
}

async function loadInitial() {
  pending.value = true
  loadError.value = ''
  try {
    const res = await fetchPage()
    events.value = res.events
    nextCursor.value = res.nextCursor
  } catch (err: unknown) {
    loadError.value = extractError(err, 'Verlauf konnte nicht geladen werden.')
    events.value = []
    nextCursor.value = null
  } finally {
    pending.value = false
    await nextTick()
    setupObserver()
    maybePrefetchShortViewport()
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value || pending.value) return
  loadingMore.value = true
  loadError.value = ''
  try {
    const res = await fetchPage(nextCursor.value)
    events.value = [...events.value, ...res.events]
    nextCursor.value = res.nextCursor
  } catch (err: unknown) {
    loadError.value = extractError(err, 'Weitere Einträge konnten nicht geladen werden.')
  } finally {
    loadingMore.value = false
    await nextTick()
    setupObserver()
    maybePrefetchShortViewport()
  }
}

function maybePrefetchShortViewport() {
  if (!nextCursor.value || loadingMore.value || pending.value) return
  const root = props.layout === 'panel' ? scrollRef.value : null
  const viewportBottom = root
    ? root.getBoundingClientRect().bottom
    : window.innerHeight
  const sentinelTop = sentinelRef.value?.getBoundingClientRect().top
  if (sentinelTop !== undefined && sentinelTop <= viewportBottom) {
    void loadMore()
  }
}

function setupObserver() {
  observer?.disconnect()
  if (!sentinelRef.value || !nextCursor.value) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadMore()
      }
    },
    {
      root: props.layout === 'panel' ? scrollRef.value : null,
      rootMargin: props.layout === 'endless' ? '200px 0px' : '80px 0px',
      threshold: 0,
    },
  )
  observer.observe(sentinelRef.value)
}

watch(
  () => props.motionId,
  () => {
    void loadInitial()
  },
)

watch([nextCursor, sentinelRef, () => props.layout], () => {
  nextTick(setupObserver)
})

onMounted(async () => {
  await loadInitial()
  nextTick(setupObserver)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    class="activity"
    :class="{
      'activity--panel': layout === 'panel',
      'activity--endless': layout === 'endless',
    }"
  >
    <div
      ref="scrollRef"
      class="activity__body"
      :class="{ 'activity__body--scroll': layout === 'panel' }"
    >
      <p v-if="pending" class="activity__loading">Verlauf wird geladen …</p>
      <p v-else-if="loadError && events.length === 0" class="activity__empty">
        {{ loadError }}
      </p>
      <p v-else-if="events.length === 0" class="activity__empty">
        Noch keine Aktivität.
      </p>

      <ol v-else class="activity__list">
        <li v-for="event in events" :key="event.id" class="activity__item">
          <span class="activity__icon">
            <FontAwesomeIcon :icon="ACTIVITY_TYPE_ICONS[event.type] ?? 'circle-info'" />
          </span>
          <div class="activity__content">
            <p class="activity__text">
              <NuxtLink
                v-if="event.actorId"
                :to="`/users/${event.actorId}`"
                class="activity__actor"
              >
                {{ event.actorName ?? 'Unbekannt' }}
              </NuxtLink>
              <span v-else class="activity__actor">{{ event.actorName ?? 'System' }}</span>
              {{ ACTIVITY_TYPE_LABELS[event.type] ?? event.type }}
              <button
                v-if="detail(event) && isActivityTargetClickable(event)"
                type="button"
                class="activity__detail activity__detail--link"
                @click="openTarget(event)"
              >
                „{{ detail(event) }}“
              </button>
              <span v-else-if="detail(event)" class="activity__detail">„{{ detail(event) }}“</span>
            </p>
            <time class="activity__time" :datetime="event.createdAt">
              {{ formatDate(event.createdAt) }}
            </time>
          </div>
        </li>
      </ol>

      <div
        v-if="!pending && nextCursor"
        ref="sentinelRef"
        class="activity__sentinel"
        aria-hidden="true"
      />
      <p v-if="loadingMore" class="activity__loading activity__loading--more">
        Weitere Einträge werden geladen …
      </p>
      <p v-else-if="loadError && events.length > 0" class="activity__load-error">
        {{ loadError }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.activity {
  min-width: 0;
}

.activity--panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  overflow: hidden;
}

.activity--endless {
  width: 100%;
}

.activity__body {
  min-width: 0;
}

.activity__body--scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
}

.activity--endless .activity__body {
  padding: 0;
}

.activity__loading,
.activity__empty,
.activity__load-error {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.activity__loading--more {
  padding-top: var(--space-2);
  padding-bottom: var(--space-4);
}

.activity__load-error {
  color: var(--color-danger);
}

.activity__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity__item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.activity__item:last-child {
  border-bottom: none;
}

.activity__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
  font-size: 0.82rem;
}

.activity__content {
  flex: 1;
  min-width: 0;
}

.activity__text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.activity__actor {
  font-weight: 700;
}

a.activity__actor {
  color: inherit;
  text-decoration: none;
}

a.activity__actor:hover {
  color: var(--color-accent);
}

.activity__detail {
  color: var(--color-text-muted);
}
.activity__detail--link {
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: var(--color-accent);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}
.activity__detail--link:hover {
  color: var(--color-text);
}

.activity__time {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.activity__sentinel {
  height: 1px;
}
</style>
