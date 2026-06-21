<script setup lang="ts">
import {
  buildChatTimeline,
  countVisiblePosts,
  type DebatePost,
} from '~/utils/debate'
import { formatChatDateLabel, htmlPreview } from '~/utils/chatDates'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionVersion?: number | null
    posts: DebatePost[]
    debateOpen: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    pending?: boolean
  }>(),
  {
    motionVersion: null,
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
    pending: false,
  },
)

const showThreads = ref(true)
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function onMenuClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

/** Map post id → the posts that reference it (inbound implicit threads). */
const inboundByPost = computed(() => {
  const map = new Map<string, DebatePost[]>()
  for (const post of props.posts) {
    for (const ref of post.references) {
      if (ref.targetType !== 'post') continue
      const list = map.get(ref.targetId) ?? []
      list.push(post)
      map.set(ref.targetId, list)
    }
  }
  return map
})

function inboundFor(postId: string): { id: string; authorName: string | null; excerpt: string }[] {
  return (inboundByPost.value.get(postId) ?? []).map((p) => ({
    id: p.id,
    authorName: p.authorName,
    excerpt: htmlPreview(p.bodyHtml, 60),
  }))
}

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

/** Scroll to a referenced message and briefly highlight it (implicit threads). */
function jumpToPost(postId: string) {
  const container = scrollRef.value
  if (!container) return
  const target = container.querySelector<HTMLElement>(`[data-post-id="${postId}"]`)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('msg--highlight')
  window.setTimeout(() => target.classList.remove('msg--highlight'), 1600)
}

function onSent() {
  replyTo.value = null
  emit('refresh')
  if (postSort.value === 'oldest') scrollToBottom()
}

onMounted(() => {
  document.addEventListener('click', onMenuClickOutside, true)
  scrollToBottom()
  updateStickyDate()
})

onUnmounted(() => document.removeEventListener('click', onMenuClickOutside, true))

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
          :inbound-refs="showThreads ? inboundFor(item.post.id) : []"
          :show-references="showThreads"
          @reply="onReply"
          @report="emit('report', $event)"
          @remove="emit('remove', $event)"
          @jump="jumpToPost"
        />
      </template>
    </div>

    <div ref="menuRef" class="chat__menu" @click.stop>
      <button
        type="button"
        class="chat__menu-trigger"
        aria-label="Chat-Optionen"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        <FontAwesomeIcon icon="ellipsis" />
      </button>
      <div v-if="menuOpen" class="chat__menu-panel" role="menu">
        <button
          type="button"
          class="chat__menu-item"
          role="menuitemradio"
          :aria-checked="postSort === 'oldest'"
          @click="postSort = 'oldest'; menuOpen = false"
        >
          <span class="chat__menu-check">
            <FontAwesomeIcon v-if="postSort === 'oldest'" icon="check" />
          </span>
          Älteste zuerst
        </button>
        <button
          type="button"
          class="chat__menu-item"
          role="menuitemradio"
          :aria-checked="postSort === 'recent'"
          @click="postSort = 'recent'; menuOpen = false"
        >
          <span class="chat__menu-check">
            <FontAwesomeIcon v-if="postSort === 'recent'" icon="check" />
          </span>
          Neueste zuerst
        </button>
        <button
          type="button"
          class="chat__menu-item"
          role="menuitemcheckbox"
          :aria-checked="showThreads"
          @click="showThreads = !showThreads; menuOpen = false"
        >
          <span class="chat__menu-check">
            <FontAwesomeIcon v-if="showThreads" icon="check" />
          </span>
          Bezüge anzeigen
        </button>
      </div>
    </div>

    <DebateComposer
      v-if="debateOpen"
      class="chat__composer"
      :motion-id="motionId"
      :motion-version="motionVersion"
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
  min-width: 0;
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
.chat__menu {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 10;
}
.chat__menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-sm);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.chat__menu-trigger:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--glass-bg) 80%, var(--color-surface) 20%);
}
.chat__menu-panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 30;
  min-width: 11rem;
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.chat__menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
}
.chat__menu-item:hover {
  background: var(--color-bg);
}
.chat__menu-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  color: var(--color-accent);
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
