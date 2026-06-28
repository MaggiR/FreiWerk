<script setup lang="ts">
import { scrollToChatMessage, scrollToChatQuote } from '~/utils/chatNavigation'
import { formatChatDateLabel } from '~/utils/chatDates'
import type { ReferenceTargetType } from '~/utils/references'
import {
  buildChatTimeline,
  buildInboundByPost,
  countVisiblePosts,
  findLatestEditableOwnPost,
  inboundRefsFor,
  postsForThreadFilter,
  type DebatePost,
  type DebateQuoteDraft,
  type ChatTimelineItem,
} from '~/utils/debate'

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
    menuInHeader?: boolean
    upvoteInContextMenu?: boolean
  }>(),
  {
    motionVersion: null,
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
    pending: false,
    menuInHeader: false,
    upvoteInContextMenu: false,
  },
)

const showThreads = defineModel<boolean>('showThreads', { default: true })

const inboundByPost = computed(() => buildInboundByPost(props.posts))

function inboundFor(postId: string) {
  return inboundRefsFor(inboundByPost.value, postId)
}

const filteredPosts = computed(() => {
  const anchorId = threadFilterAnchorId.value
  if (!anchorId) return props.posts
  return postsForThreadFilter(props.posts, anchorId, inboundByPost.value)
})

const postSort = defineModel<'recent' | 'oldest'>('postSort', { default: 'oldest' })

const timeline = computed(() => buildChatTimeline(filteredPosts.value, postSort.value))

const threadFilterAnchorName = computed(() => {
  const anchorId = threadFilterAnchorId.value
  if (!anchorId) return null
  return postById(anchorId)?.authorName ?? null
})

function timelineItemKey(item: ChatTimelineItem): string {
  return item.type === 'date' ? `d-${item.key}` : item.post.id
}

const emit = defineEmits<{
  refresh: []
  report: [postId: string]
  delete: [postId: string]
  save: [postId: string]
  login: []
}>()

const replyTo = ref<DebatePost | null>(null)
const editTarget = ref<DebatePost | null>(null)
const quoteDraft = ref<DebateQuoteDraft | null>(null)
const threadFilterAnchorId = ref<string | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const composerWrapRef = ref<HTMLElement | null>(null)
const stickyDateLabel = ref('')
/** True when the user is viewing the latest messages (within scroll slack). */
const pinnedToBottom = ref(true)
const composerPad = ref(80)

const COMPOSER_PAD_EXTRA = 16

function isNearBottom(el: HTMLElement, slack = 32): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
    pinnedToBottom.value = true
    updateStickyDate()
  })
}

function syncComposerScrollLayout() {
  const wrap = composerWrapRef.value
  const el = scrollRef.value
  if (!wrap || !el) return

  composerPad.value = wrap.offsetHeight + COMPOSER_PAD_EXTRA

  if (pinnedToBottom.value) {
    nextTick(() => {
      el.scrollTop = el.scrollHeight
      updateStickyDate()
    })
  }
}

let composerResizeObserver: ResizeObserver | null = null

function setupComposerObserver() {
  if (!import.meta.client) return
  const wrap = composerWrapRef.value
  if (!wrap) return
  composerResizeObserver?.disconnect()
  composerResizeObserver = new ResizeObserver(() => syncComposerScrollLayout())
  composerResizeObserver.observe(wrap)
  syncComposerScrollLayout()
}

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

function stickyDateScrollThreshold(container: HTMLElement): number {
  if (props.menuInHeader) {
    const pill = container.closest('.chat')?.querySelector<HTMLElement>('.chat__sticky-date')
    if (pill) return pill.getBoundingClientRect().bottom
  }
  return container.getBoundingClientRect().top + 36
}

function updateStickyDate() {
  const container = scrollRef.value
  if (!container) return

  const markers = container.querySelectorAll<HTMLElement>('[data-chat-day]')
  const containerTop = stickyDateScrollThreshold(container)
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
  const el = scrollRef.value
  if (el) pinnedToBottom.value = isNearBottom(el)
  updateStickyDate()
}

function restoreScrollPosition() {
  nextTick(() => {
    const el = scrollRef.value
    if (!el) return
    const stored = sessionStorage.getItem(`freiwerk-debate-scroll-${props.motionId}`)
    if (stored !== null) {
      const top = Number(stored)
      if (Number.isFinite(top) && top >= 0) {
        el.scrollTop = top
        pinnedToBottom.value = isNearBottom(el)
        updateStickyDate()
        syncComposerScrollLayout()
        return
      }
    }
    if (postSort.value === 'oldest') scrollToBottom()
    else pinnedToBottom.value = isNearBottom(el)
    updateStickyDate()
    syncComposerScrollLayout()
  })
}

function persistScrollPosition() {
  const el = scrollRef.value
  if (!el) return
  sessionStorage.setItem(`freiwerk-debate-scroll-${props.motionId}`, String(el.scrollTop))
}

watch(
  () => props.posts.length,
  () => {
    if (postSort.value === 'oldest') scrollToBottom()
    nextTick(updateStickyDate)
  },
)

watch(timelineWithLabels, () => nextTick(updateStickyDate), { immediate: true })

watch(
  () => props.posts,
  () => {
    const anchorId = threadFilterAnchorId.value
    if (anchorId && !postById(anchorId)) {
      threadFilterAnchorId.value = null
    }
  },
)

function onReply(postId: string) {
  editTarget.value = null
  quoteDraft.value = null
  replyTo.value = postById(postId) ?? null
}

function clearThreadFilter() {
  threadFilterAnchorId.value = null
}

function onFocusThread(postId: string) {
  if (threadFilterAnchorId.value === postId) {
    threadFilterAnchorId.value = null
    return
  }
  threadFilterAnchorId.value = postId
  onReply(postId)
  nextTick(() => {
    requestAnimationFrame(() => {
      const container = scrollRef.value
      if (container) scrollToChatMessage(container, postId)
    })
  })
}

function onQuote(draft: DebateQuoteDraft) {
  editTarget.value = null
  quoteDraft.value = draft
}

function onEdit(postId: string) {
  replyTo.value = null
  quoteDraft.value = null
  editTarget.value = postById(postId) ?? null
}

function onEditLatest() {
  if (!props.loggedIn || !props.debateOpen) return
  const post = findLatestEditableOwnPost(
    props.posts,
    props.currentUserId,
    props.debateOpen,
  )
  if (!post) return
  onEdit(post.id)
}

const toast = useToast()
const { navigateTo: navigateToDeliberation } = useDeliberationNav()
const { navigateTo: navigateToMotionExcerpt } = useMotionExcerptNav()

/** Scroll to a referenced message and briefly highlight it (optionally the excerpt). */
function jumpToPost(postId: string, excerpt?: string) {
  const container = scrollRef.value
  if (!container) return
  const found = scrollToChatQuote(container, postId, excerpt)
  if (!found) {
    toast.info('Die referenzierte Nachricht ist nicht mehr verfügbar.')
  }
}

function onJumpDeliberation(targetType: ReferenceTargetType, targetId: string) {
  navigateToDeliberation({ targetType, targetId })
}

function onJumpMotionExcerpt(motionId: string, excerptText: string) {
  navigateToMotionExcerpt({ motionId, excerptText })
}

function onSent() {
  replyTo.value = null
  quoteDraft.value = null
  emit('refresh')
  if (postSort.value === 'oldest') scrollToBottom()
}

function onEdited() {
  editTarget.value = null
  emit('refresh')
}

watch(
  () => [replyTo.value, editTarget.value, quoteDraft.value] as const,
  () => nextTick(syncComposerScrollLayout),
)

watch(
  () => props.debateOpen,
  (open) => {
    if (open) nextTick(setupComposerObserver)
  },
  { immediate: true },
)

onMounted(() => {
  restoreScrollPosition()
  nextTick(setupComposerObserver)
})

onBeforeUnmount(() => {
  composerResizeObserver?.disconnect()
  composerResizeObserver = null
  persistScrollPosition()
})

defineExpose({ countVisible: () => countVisiblePosts(props.posts) })
</script>

<template>
  <div class="chat">
    <div v-if="stickyDateLabel && posts.length > 0" class="chat__sticky-date" aria-hidden="true">
      {{ stickyDateLabel }}
    </div>

    <div
      ref="scrollRef"
      class="chat__scroll"
      :style="{ paddingBottom: `${composerPad}px` }"
      @scroll="onScroll"
    >
      <p v-if="pending && posts.length === 0" class="chat__loading">Nachrichten werden geladen …</p>
      <p v-else-if="posts.length === 0" class="chat__empty">
        Noch keine Beiträge. Starte die Debatte!
      </p>

      <Transition name="chat-filter">
        <div
          v-if="threadFilterAnchorId"
          class="chat__filter-bar"
          role="status"
        >
          <span class="chat__filter-label">
            Bezüge auf {{ threadFilterAnchorName ?? 'Nachricht' }}
          </span>
          <button
            type="button"
            class="chat__filter-clear"
            @click="clearThreadFilter"
          >
            Alle Nachrichten
          </button>
        </div>
      </Transition>

      <TransitionGroup name="chat-item" tag="div" class="chat__timeline">
        <div
          v-for="item in displayTimeline"
          :key="timelineItemKey(item)"
          class="chat__timeline-item"
          :class="{ 'chat__timeline-item--date': item.type === 'date' }"
        >
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
            :logged-in="loggedIn"
            :current-user-id="currentUserId"
            :is-own="item.post.authorId === currentUserId"
            :inbound-refs="showThreads ? inboundFor(item.post.id) : []"
            :show-references="showThreads"
            :thread-filter-active="threadFilterAnchorId === item.post.id"
            :upvote-in-context-menu="upvoteInContextMenu"
            @reply="onReply"
            @quote="onQuote"
            @edit="onEdit"
            @delete="emit('delete', $event)"
            @save="emit('save', $event)"
            @report="emit('report', $event)"
            @jump="jumpToPost"
            @jump-deliberation="onJumpDeliberation"
            @jump-motion-excerpt="onJumpMotionExcerpt"
            @focus-thread="onFocusThread"
          />
        </div>
      </TransitionGroup>
    </div>

    <div v-if="!menuInHeader" class="chat__menu">
      <DebateChatOptionsMenu
        v-model:post-sort="postSort"
        v-model:show-threads="showThreads"
      />
    </div>

    <div v-if="debateOpen" ref="composerWrapRef" class="chat__composer">
      <DebateComposer
        :motion-id="motionId"
        :motion-version="motionVersion"
        :parent-id="replyTo?.id"
        :reply-to-name="replyTo?.authorName"
        :quote-draft="quoteDraft"
        :edit-post="editTarget ? { id: editTarget.id, bodyHtml: editTarget.bodyHtml } : null"
        :logged-in="loggedIn"
        @sent="onSent"
        @edited="onEdited"
        @cancel-reply="replyTo = null"
        @cancel-quote="quoteDraft = null"
        @cancel-edit="editTarget = null"
        @jump-quote="jumpToPost($event.postId, $event.excerpt)"
        @edit-latest="onEditLatest"
        @login="emit('login')"
      />
    </div>
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
  overflow-anchor: none;
  /* Top room for sticky date; bottom padding tracks composer height inline. */
  padding: 2.25rem 0 0;
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
.chat__loading,
.chat__empty,
.chat__closed-hint {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.88rem;
}
.chat__timeline {
  position: relative;
}
.chat__filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 var(--space-2) var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-sm);
}
.chat__filter-label {
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat__filter-clear {
  flex-shrink: 0;
  padding: 0.2rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-accent);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.chat__filter-clear:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
}
.chat-filter-enter-active,
.chat-filter-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.chat-filter-enter-from,
.chat-filter-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem);
}
.chat-item-enter-active,
.chat-item-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.chat-item-enter-from,
.chat-item-leave-to {
  opacity: 0;
  transform: translateY(0.35rem);
}
.chat-item-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
.chat-item-move {
  transition: transform 0.28s ease;
}
@media (prefers-reduced-motion: reduce) {
  .chat-filter-enter-active,
  .chat-filter-leave-active,
  .chat-item-enter-active,
  .chat-item-leave-active,
  .chat-item-move {
    transition: none;
  }
  .chat-filter-enter-from,
  .chat-filter-leave-to,
  .chat-item-enter-from,
  .chat-item-leave-to {
    transform: none;
  }
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
