<script setup lang="ts">
import {
  buildChatTimeline,
  countVisiblePosts,
  type DebatePost,
} from '~/utils/debate'
import { formatChatDateLabel } from '~/utils/chatDates'

const props = withDefaults(
  defineProps<{
    motionId: string
    posts: DebatePost[]
    debateOpen: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    pending?: boolean
  }>(),
  {
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
    pending: false,
  },
)

const postSort = defineModel<'recent' | 'oldest'>('postSort', { default: 'oldest' })

const emit = defineEmits<{
  refresh: []
  report: [postId: string]
  remove: [postId: string]
  login: []
}>()

const replyTo = ref<DebatePost | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const stickyDateLabel = ref('')

const timeline = computed(() => buildChatTimeline(props.posts, postSort.value))

const timelineWithLabels = computed(() =>
  timeline.value.map((item) => {
    if (item.type !== 'date') return item
    return { ...item, label: formatChatDateLabel(`${item.key}T12:00:00`) }
  }),
)

/** First date pill is omitted — the sticky header already shows it. */
const displayTimeline = computed(() => {
  let skippedFirstDate = false
  return timelineWithLabels.value.filter((item) => {
    if (item.type !== 'date') return true
    if (!skippedFirstDate) {
      skippedFirstDate = true
      return false
    }
    return true
  })
})

function postById(id: string): DebatePost | undefined {
  return props.posts.find((p) => p.id === id)
}

function updateStickyDate() {
  const container = scrollRef.value
  if (!container) return

  const markers = container.querySelectorAll<HTMLElement>('[data-chat-day]')
  const containerTop = container.getBoundingClientRect().top + 36
  let activeKey: string | null = null

  for (const marker of markers) {
    if (marker.getBoundingClientRect().top <= containerTop) {
      activeKey = marker.dataset.chatDay ?? null
    }
  }

  if (!activeKey) {
    const first = timelineWithLabels.value.find((i) => i.type === 'date')
    stickyDateLabel.value = first?.type === 'date' ? first.label : ''
    return
  }

  stickyDateLabel.value = formatChatDateLabel(`${activeKey}T12:00:00`)
}

function onScroll() {
  updateStickyDate()
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

watch(
  () => props.posts.length,
  () => {
    if (postSort.value === 'oldest') scrollToBottom()
    nextTick(updateStickyDate)
  },
)

watch(timelineWithLabels, () => nextTick(updateStickyDate), { immediate: true })

function onReply(postId: string) {
  replyTo.value = postById(postId) ?? null
}

function onSent() {
  replyTo.value = null
  emit('refresh')
  if (postSort.value === 'oldest') scrollToBottom()
}

async function onReact(postId: string, emoji: string) {
  try {
    await $fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      body: { emoji },
    })
    emit('refresh')
  } catch {
    emit('refresh')
  }
}

onMounted(() => {
  scrollToBottom()
  updateStickyDate()
})

defineExpose({ countVisible: () => countVisiblePosts(props.posts) })
</script>

<template>
  <div class="chat">
    <div v-if="stickyDateLabel && posts.length > 0" class="chat__sticky-date" aria-hidden="true">
      {{ stickyDateLabel }}
    </div>

    <div ref="scrollRef" class="chat__scroll" @scroll="onScroll">
      <p v-if="pending" class="chat__loading">Nachrichten werden geladen …</p>
      <p v-else-if="posts.length === 0" class="chat__empty">
        Noch keine Beiträge. Starte die Debatte!
      </p>

      <template v-for="item in displayTimeline" :key="item.type === 'date' ? `d-${item.key}` : item.post.id">
        <div
          v-if="item.type === 'date'"
          class="chat__date-marker"
          :data-chat-day="item.key"
        >
          <span class="chat__date-pill">{{ item.label }}</span>
        </div>
        <DebateMessage
          v-else
          :post="item.post"
          :parent-preview="item.parentPreview"
          :debate-open="debateOpen"
          :can-moderate="canModerate"
          :logged-in="loggedIn"
          :current-user-id="currentUserId"
          :is-own="item.post.authorId === currentUserId"
          @reply="onReply"
          @report="emit('report', $event)"
          @remove="emit('remove', $event)"
          @react="onReact"
        />
      </template>
    </div>

    <DebateComposer
      v-if="debateOpen"
      class="chat__composer"
      :motion-id="motionId"
      :parent-id="replyTo?.id"
      :reply-to-name="replyTo?.authorName"
      :logged-in="loggedIn"
      @sent="onSent"
      @cancel-reply="replyTo = null"
      @login="emit('login')"
    />
    <p v-else class="chat__closed-hint">
      Die Debattenphase ist abgeschlossen.
    </p>
  </div>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  overflow: hidden;
}
.chat__sticky-date {
  position: absolute;
  top: var(--space-2);
  left: 50%;
  z-index: 10;
  transform: translateX(-50%);
  padding: 0.2rem var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-sm);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-text);
  pointer-events: none;
  white-space: nowrap;
}
.chat__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Room for sticky date (top) and floating composer (bottom). */
  padding: 2.25rem 0 5rem;
}
.chat__composer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  background: transparent;
}
.chat__composer :deep(.composer) {
  padding-top: var(--space-2);
  background: transparent;
}
.chat__loading,
.chat__empty,
.chat__closed-hint {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.88rem;
}
.chat__date-marker {
  display: flex;
  justify-content: center;
  padding: var(--space-3) var(--space-3) var(--space-2);
}
.chat__date-pill {
  padding: 0.15rem var(--space-3);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-text-muted);
}
.chat__closed-hint {
  flex-shrink: 0;
  margin: 0;
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
}
</style>
