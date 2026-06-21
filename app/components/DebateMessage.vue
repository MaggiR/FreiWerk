<script setup lang="ts">
import type { DebatePost } from '~/utils/debate'
import { formatChatTime } from '~/utils/chatDates'
import { formatAuthorAffiliation } from '~/utils/format'
import { REFERENCE_ICONS } from '~/utils/references'
import { REFERENCE_TARGET_LABELS } from '#shared/constants'

const props = withDefaults(
  defineProps<{
    post: DebatePost
    parentPreview?: { authorName: string | null; excerpt: string } | null
    debateOpen?: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    isOwn?: boolean
    inboundRefs?: { id: string; authorName: string | null; excerpt: string }[]
    showReferences?: boolean
  }>(),
  {
    parentPreview: null,
    debateOpen: false,
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
    isOwn: false,
    inboundRefs: () => [],
    showReferences: true,
  },
)

const emit = defineEmits<{
  reply: [postId: string]
  report: [postId: string]
  remove: [postId: string]
  jump: [postId: string]
}>()

const inboundExpanded = ref(false)
const upvoteCount = ref(props.post.upvoteCount)
const upvotedByMe = ref(props.post.upvotedByMe)

watch(
  () => props.post.upvoteCount,
  (value) => {
    upvoteCount.value = value
  },
)

watch(
  () => props.post.upvotedByMe,
  (value) => {
    upvotedByMe.value = value
  },
)

watch(
  () => props.post.id,
  () => {
    upvoteCount.value = props.post.upvoteCount
    upvotedByMe.value = props.post.upvotedByMe
  },
)

function onUpvoteChange(payload: { count: number; upvoted: boolean }) {
  upvoteCount.value = payload.count
  upvotedByMe.value = payload.upvoted
}

const { open: openAuthModal } = useAuthModal()

const canReply = computed(() => props.debateOpen && !props.post.deleted)
const canReport = computed(
  () =>
    props.loggedIn &&
    !props.post.deleted &&
    props.post.authorId !== props.currentUserId,
)
const hasRevealActions = computed(
  () => canReply.value || canReport.value || props.canModerate,
)

function onReply() {
  if (!props.loggedIn) {
    openAuthModal('login')
    return
  }
  emit('reply', props.post.id)
}

const previewText = computed(() => props.parentPreview?.excerpt ?? '')

const authorAffiliation = computed(() =>
  formatAuthorAffiliation(props.post.authorFn, props.post.authorRole),
)

const metaEl = ref<HTMLElement | null>(null)
const hoverMenuEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
const hoverMenuShift = ref('0px')

// In compact mode the timestamp floats over the bottom-right corner of the text.
// We only reserve a trailing line when the last text line would actually collide
// with it; otherwise the text keeps the full bubble width.
const timeCollision = ref(false)
const timeReserve = ref(0)

function updateHoverMenuShift() {
  nextTick(() => {
    const meta = metaEl.value
    const menu = hoverMenuEl.value
    if (!meta || !menu) {
      hoverMenuShift.value = '0px'
      return
    }
    const overflow = menu.offsetWidth - meta.clientWidth
    hoverMenuShift.value = overflow > 0 ? `${-overflow}px` : '0px'
  })
}

function updateTimeCollision() {
  nextTick(() => {
    if (upvoteCount.value > 0) {
      timeCollision.value = false
      return
    }
    const body = bodyEl.value
    const meta = metaEl.value
    if (!body || !meta) {
      timeCollision.value = false
      return
    }
    const range = document.createRange()
    range.selectNodeContents(body)
    const rects = range.getClientRects()
    if (rects.length === 0) {
      timeCollision.value = false
      return
    }
    const bodyRect = body.getBoundingClientRect()
    const lastRect = rects[rects.length - 1]!
    const lastLineEnd = lastRect.right - bodyRect.left
    const gap = 8
    timeReserve.value = meta.offsetHeight + 3
    timeCollision.value = lastLineEnd + meta.offsetWidth + gap > body.clientWidth
  })
}

function updateLayout() {
  updateHoverMenuShift()
  updateTimeCollision()
}

watch(
  [
    hasRevealActions,
    upvoteCount,
    () => props.post.bodyHtml,
    inboundExpanded,
    () => props.canModerate,
    () => props.debateOpen,
    () => props.loggedIn,
  ],
  updateLayout,
)

watchEffect((onCleanup) => {
  const meta = metaEl.value
  const menu = hoverMenuEl.value
  const body = bodyEl.value
  if (!meta) {
    return
  }
  updateLayout()
  const observer = new ResizeObserver(() => updateLayout())
  observer.observe(meta)
  if (menu) {
    observer.observe(menu)
  }
  if (body) {
    observer.observe(body)
  }
  onCleanup(() => observer.disconnect())
})
</script>

<template>
  <article
    class="msg"
    :class="{
      'msg--own': isOwn,
      'msg--deleted': post.deleted,
    }"
    :data-post-id="post.id"
  >
    <template v-if="post.deleted">
      <p class="msg__tombstone">
        <FontAwesomeIcon icon="trash" />
        Beitrag entfernt
      </p>
    </template>
    <template v-else>
      <div class="msg__row">
        <NuxtLink
          v-if="post.authorId && !isOwn"
          :to="`/users/${post.authorId}`"
          class="msg__avatar"
          :aria-label="post.authorName ?? 'Profil'"
        >
          <UserAvatar
            :avatar-url="post.authorAvatarUrl"
            :name="post.authorName"
            size="sm"
          />
        </NuxtLink>

        <div class="msg__bubble" @mouseenter="updateHoverMenuShift" @focusin="updateHoverMenuShift">
          <span v-if="!isOwn" class="msg__author">
            <span class="msg__author-name">{{ post.authorName ?? 'Unbekannt' }}</span>
            <span v-if="authorAffiliation" class="msg__author-fn"> · {{ authorAffiliation }}</span>
          </span>
          <div v-if="parentPreview" class="msg__quote">
            <FontAwesomeIcon class="msg__quote-icon" icon="reply" />
            <span class="msg__quote-author">{{ parentPreview.authorName ?? 'Unbekannt' }}:</span>
            <span class="msg__quote-text">{{ previewText }}</span>
          </div>

          <ul
            v-if="showReferences && post.references.length > 0"
            class="msg__refs"
          >
            <li
              v-for="ref in post.references"
              :key="ref.id"
              class="msg__ref"
              :class="{ 'msg__ref--clickable': ref.targetType === 'post' && ref.available }"
              @click="ref.targetType === 'post' && ref.available ? emit('jump', ref.targetId) : null"
            >
              <FontAwesomeIcon class="msg__ref-icon" :icon="REFERENCE_ICONS[ref.targetType]" />
              <span class="msg__ref-type">{{ REFERENCE_TARGET_LABELS[ref.targetType] }}:</span>
              <span class="msg__ref-text">{{ ref.label }}</span>
            </li>
          </ul>

          <div
            class="msg__content"
            :class="{
              'msg__content--compact': upvoteCount === 0,
              'msg__content--time-break': upvoteCount === 0 && timeCollision,
            }"
            :style="upvoteCount === 0 && timeCollision ? { paddingBottom: `${timeReserve}px` } : undefined"
          >
            <div ref="bodyEl" class="msg__body">
              <RichText :html="post.bodyHtml" />
            </div>

            <div ref="metaEl" class="msg__meta" :class="{ 'msg__meta--compact': upvoteCount === 0 }">
              <div v-if="upvoteCount > 0" class="msg__actions">
                <span class="msg__upvote msg__upvote--shown">
                  <UpvoteButton
                    target-type="post"
                    :target-id="post.id"
                    :count="upvoteCount"
                    :upvoted="upvotedByMe"
                    size="sm"
                    context-label="Beitrag"
                    @change="onUpvoteChange"
                  />
                </span>
              </div>
              <div
                v-if="upvoteCount === 0 || hasRevealActions"
                ref="hoverMenuEl"
                class="msg__hover-menu"
                :class="{ 'msg__hover-menu--solo': upvoteCount === 0 }"
                :style="{ '--msg-hover-menu-shift': hoverMenuShift }"
              >
                <span v-if="upvoteCount === 0" class="msg__upvote">
                  <UpvoteButton
                    target-type="post"
                    :target-id="post.id"
                    :count="upvoteCount"
                    :upvoted="upvotedByMe"
                    size="sm"
                    context-label="Beitrag"
                    @change="onUpvoteChange"
                  />
                </span>
                <button
                  v-if="canReply"
                  type="button"
                  class="msg__action"
                  aria-label="Antworten"
                  @click="onReply"
                >
                  <FontAwesomeIcon icon="reply" />
                </button>
                <button
                  v-if="canReport"
                  type="button"
                  class="msg__action"
                  aria-label="Melden"
                  @click="emit('report', post.id)"
                >
                  <FontAwesomeIcon icon="flag" />
                </button>
                <button
                  v-if="canModerate"
                  type="button"
                  class="msg__action msg__action--danger"
                  aria-label="Entfernen"
                  @click="emit('remove', post.id)"
                >
                  <FontAwesomeIcon icon="trash" />
                </button>
              </div>
              <div class="msg__meta-end">
                <button
                  v-if="showReferences && inboundRefs.length > 0"
                  type="button"
                  class="msg__threadbtn"
                  :aria-expanded="inboundExpanded"
                  @click="inboundExpanded = !inboundExpanded"
                >
                  <FontAwesomeIcon icon="diagram-project" />
                  {{ inboundRefs.length }} {{ inboundRefs.length === 1 ? 'Bezug' : 'Bezüge' }}
                </button>
                <time class="msg__time" :datetime="post.createdAt">{{ formatChatTime(post.createdAt) }}</time>
              </div>
            </div>
          </div>

          <ul v-if="inboundExpanded && inboundRefs.length > 0" class="msg__inbound">
            <li
              v-for="ref in inboundRefs"
              :key="ref.id"
              class="msg__inbound-item"
              @click="emit('jump', ref.id)"
            >
              <FontAwesomeIcon class="msg__inbound-icon" icon="turn-up" />
              <span class="msg__inbound-author">{{ ref.authorName ?? 'Unbekannt' }}:</span>
              <span class="msg__inbound-text">{{ ref.excerpt }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </article>
</template>

<style scoped>
.msg {
  position: relative;
  padding: var(--space-1) var(--space-2);
}
.msg--own .msg__row {
  flex-direction: row-reverse;
}
.msg--own .msg__bubble {
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
}
.msg__tombstone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2);
  font-size: 0.82rem;
  font-style: italic;
  color: var(--color-text-muted);
}
.msg__quote {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  margin: 0 0 var(--space-1);
  padding-left: var(--space-2);
  border-left: 2px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  font-size: 0.74rem;
  line-height: 1.3;
  color: var(--color-text-muted);
}
.msg__quote-icon {
  flex-shrink: 0;
  font-size: 0.62rem;
  color: var(--color-accent);
}
.msg__quote-author {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--color-accent);
}
.msg__quote-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  max-width: 100%;
}
.msg__avatar {
  flex-shrink: 0;
  margin-top: 0.15rem;
  text-decoration: none;
}
.msg__bubble {
  position: relative;
  flex: 0 1 auto;
  width: fit-content;
  max-width: 92%;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.msg__author {
  display: block;
  margin-bottom: var(--space-1);
  font-size: 0.78rem;
  line-height: 1.25;
}
.msg__author-name {
  font-weight: 700;
  color: var(--color-accent);
}
.msg__author-fn {
  font-weight: 500;
  color: var(--color-text-muted);
}
.msg__body {
  font-size: 0.9rem;
  line-height: 1.45;
}
.msg__content--compact {
  position: relative;
  /* Meta (time + hover menu) overlays the bottom-right corner of the text block.
     The text spans the full width; a trailing line is only reserved (via the
     bound padding-bottom on --time-break) when the last line would collide. */
}
.msg__content--compact .msg__body {
  min-width: 0;
}
.msg__body :deep(.rich-text p) {
  margin: 0;
}
.msg__body :deep(.rich-text p + p) {
  margin-top: var(--space-1);
}
.msg__content--compact .msg__body :deep(.rich-text > :last-child) {
  margin-bottom: 0;
}
/* One row below the text: action bar (left) + meta/time (right). */
.msg__meta {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 0.15rem;
  min-width: 0;
  max-width: 100%;
}
.msg__meta--compact {
  position: absolute;
  right: 0;
  bottom: 0;
  margin-top: 0;
  min-height: 0;
}
.msg__meta--compact .msg__meta-end {
  margin-left: 0;
}
.msg__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
}
.msg__meta-end {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
  flex-shrink: 0;
}
/* Upvote visible only when at least one vote exists (otherwise it lives in the hover menu). */
.msg__upvote {
  display: none;
}
.msg__upvote--shown {
  display: inline-flex;
}
/* Floating hover menu: fades and slides in below the meta row. */
.msg__hover-menu {
  position: absolute;
  left: 0;
  top: calc(100% - 0.5rem);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  width: max-content;
  box-sizing: border-box;
  padding: 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-sm);
  opacity: 0;
  transform: translateX(var(--msg-hover-menu-shift, 0)) translateY(0.2rem);
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.msg__bubble:hover .msg__hover-menu,
.msg__bubble:focus-within .msg__hover-menu {
  opacity: 1;
  transform: translateX(var(--msg-hover-menu-shift, 0));
  pointer-events: auto;
}
.msg__meta--compact .msg__upvote {
  display: inline-flex;
}
/* Flat icon buttons inside the floating panel. */
.msg__hover-menu .msg__upvote :deep(.upvote) {
  border-color: transparent;
  background: transparent;
}
.msg__hover-menu .msg__upvote :deep(.upvote:hover:not(:disabled)) {
  background: var(--color-bg);
}
@media (prefers-reduced-motion: reduce) {
  .msg__hover-menu {
    transition: none;
  }
  .msg__bubble:hover .msg__hover-menu,
  .msg__bubble:focus-within .msg__hover-menu {
    transform: translateX(var(--msg-hover-menu-shift, 0));
  }
}
.msg__time {
  flex-shrink: 0;
  font-size: 0.65rem;
  line-height: 1;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  user-select: none;
  white-space: nowrap;
}
.msg__refs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin: 0 0 var(--space-1);
  padding: 0;
  list-style: none;
}
.msg__ref {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.15rem var(--space-2);
  border-left: 2px solid color-mix(in srgb, var(--color-tertiary) 60%, transparent);
  background: color-mix(in srgb, var(--color-tertiary) 8%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.74rem;
  line-height: 1.3;
  color: var(--color-text-muted);
}
.msg__ref--clickable {
  cursor: pointer;
}
.msg__ref--clickable:hover {
  background: color-mix(in srgb, var(--color-tertiary) 16%, transparent);
}
.msg__ref-icon {
  flex-shrink: 0;
  font-size: 0.62rem;
  color: var(--color-tertiary);
}
.msg__ref-type {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--color-tertiary);
}
.msg__ref-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg__threadbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  cursor: pointer;
}
.msg__threadbtn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.msg__inbound {
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
}
.msg__inbound-item {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.15rem var(--space-2);
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--color-text-muted);
  cursor: pointer;
}
.msg__inbound-item:hover {
  color: var(--color-text);
}
.msg__inbound-icon {
  flex-shrink: 0;
  font-size: 0.62rem;
  color: var(--color-accent);
}
.msg__inbound-author {
  flex-shrink: 0;
  font-weight: 600;
}
.msg__inbound-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg--highlight .msg__bubble {
  animation: msg-highlight 1.6s ease;
}
@keyframes msg-highlight {
  0%,
  40% {
    background: color-mix(in srgb, var(--color-accent) 28%, var(--color-surface));
  }
  100% {
    background: var(--color-surface);
  }
}
.msg__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.msg__action:hover {
  color: var(--color-accent);
  background: var(--color-bg);
}
.msg__action--danger:hover {
  color: var(--color-danger);
}
</style>
