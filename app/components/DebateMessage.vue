<script setup lang="ts">
import type { DebateMessageMenuAction, DebateMessageMenuItem } from '~/utils/debateMessageMenu'
import type { DebateQuoteDraft, DebatePost } from '~/utils/debate'
import { getSelectionExcerptIn } from '~/utils/chatQuote'
import { htmlToPlainText, formatChatTime } from '~/utils/chatDates'
import { formatDateTime, formatAuthorAffiliation } from '~/utils/format'
import { isPostEdited } from '~/utils/debate'
import { isDeliberationReferenceType } from '~/utils/deliberationNavigation'
import { REFERENCE_ICONS, referenceExcerptText } from '~/utils/references'
import { REFERENCE_TARGET_LABELS, POST_EDIT_WINDOW_MS } from '#shared/constants'

const props = withDefaults(
  defineProps<{
    post: DebatePost
    parentPreview?: { postId: string; authorName: string | null; excerpt: string } | null
    debateOpen?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    isOwn?: boolean
    inboundRefs?: { id: string; authorName: string | null; excerpt: string }[]
    showReferences?: boolean
    threadFilterActive?: boolean
    /** Fullscreen debate: upvote sits above the context menu instead of on hover. */
    upvoteInContextMenu?: boolean
  }>(),
  {
    parentPreview: null,
    debateOpen: false,
    loggedIn: false,
    currentUserId: null,
    isOwn: false,
    inboundRefs: () => [],
    showReferences: true,
    threadFilterActive: false,
    upvoteInContextMenu: false,
  },
)

const emit = defineEmits<{
  reply: [postId: string]
  quote: [draft: DebateQuoteDraft]
  edit: [postId: string]
  delete: [postId: string]
  save: [postId: string]
  report: [postId: string]
  jump: [postId: string, excerpt?: string]
  jumpDeliberation: [targetType: DebatePost['references'][number]['targetType'], targetId: string]
  jumpMotionExcerpt: [motionId: string, excerptText: string]
  focusThread: [postId: string]
}>()

const toast = useToast()
const upvoteCount = ref(props.post.upvoteCount)
const upvotedByMe = ref(props.post.upvotedByMe)
const savedByMe = ref(props.post.savedByMe)

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
  () => props.post.savedByMe,
  (value) => {
    savedByMe.value = value
  },
)

watch(
  () => props.post.id,
  () => {
    upvoteCount.value = props.post.upvoteCount
    upvotedByMe.value = props.post.upvotedByMe
    savedByMe.value = props.post.savedByMe
  },
)

function onUpvoteChange(payload: { count: number; upvoted: boolean }) {
  upvoteCount.value = payload.count
  upvotedByMe.value = payload.upvoted
}

const { open: openAuthModal } = useAuthModal()

const { openMenu, closeMenu, isMenuOpen } = useDebateMessageMenu()

const menuOpen = computed(() => isMenuOpen(props.post.id))
const menuX = ref(0)
const menuY = ref(0)
const menuTriggerRef = ref<HTMLElement | null>(null)
const menuSelectionExcerpt = ref<string | null>(null)

const isCoarsePointer = ref(false)

onMounted(() => {
  if (!import.meta.client) return
  isCoarsePointer.value = window.matchMedia('(hover: none) and (pointer: coarse)').matches
})

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed)
}

function isInteractiveRefTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('a, button, .msg__ref--clickable, .msg__menu-trigger, .upvote'),
  )
}

const canReply = computed(() => props.debateOpen && !props.post.deleted)
const canEdit = computed(() => {
  if (!props.isOwn || !props.loggedIn || props.post.deleted || !props.debateOpen) {
    return false
  }
  if (!props.currentUserId || props.post.authorId !== props.currentUserId) {
    return false
  }
  return Date.now() - new Date(props.post.createdAt).getTime() <= POST_EDIT_WINDOW_MS
})
const canDelete = computed(
  () =>
    props.isOwn &&
    props.loggedIn &&
    !props.post.deleted &&
    props.debateOpen &&
    props.post.authorId === props.currentUserId,
)
const canCopy = computed(() => !props.post.deleted)
const canSave = computed(() => props.loggedIn && !props.post.deleted)
const canReport = computed(
  () =>
    props.loggedIn &&
    !props.post.deleted &&
    props.post.authorId !== props.currentUserId,
)

const menuItems = computed<DebateMessageMenuItem[]>(() => {
  const items: DebateMessageMenuItem[] = []
  if (canReply.value) {
    if (menuSelectionExcerpt.value) {
      items.push({ action: 'quote', label: 'Zitieren', icon: 'quote-left' })
    } else {
      items.push({ action: 'reply', label: 'Antworten', icon: 'reply' })
    }
  }
  if (canEdit.value) {
    items.push({ action: 'edit', label: 'Bearbeiten', icon: 'pen' })
  }
  if (canDelete.value) {
    items.push({ action: 'delete', label: 'Löschen', icon: 'trash', danger: true })
  }
  if (canCopy.value) {
    items.push({ action: 'copy', label: 'Kopieren', icon: 'copy' })
  }
  if (canSave.value) {
    items.push({
      action: 'save',
      label: savedByMe.value ? 'Merken aufheben' : 'Merken',
      icon: savedByMe.value ? 'bookmark' : 'bookmark',
    })
  }
  if (canReport.value) {
    items.push({ action: 'report', label: 'Melden', icon: 'flag' })
  }
  return items
})

const canShowContextUpvote = computed(
  () => props.upvoteInContextMenu && props.debateOpen && !props.post.deleted,
)

const canOpenMenu = computed(
  () => menuItems.value.length > 0 || canShowContextUpvote.value,
)

function openMenuAt(x: number, y: number) {
  if (!canOpenMenu.value) return
  menuX.value = x
  menuY.value = y
  openMenu(props.post.id)
}

function onContextMenu(event: MouseEvent) {
  if (props.post.deleted || isCoarsePointer.value) return
  if (hasActiveTextSelection()) return
  menuSelectionExcerpt.value = bodyEl.value
    ? getSelectionExcerptIn(bodyEl.value)
    : null
  event.preventDefault()
  openMenuAt(event.clientX, event.clientY)
}

function onBubbleClick(event: MouseEvent) {
  if (!isCoarsePointer.value || props.post.deleted) return
  if (isInteractiveRefTarget(event.target)) return
  if (hasActiveTextSelection()) return
  if (!canOpenMenu.value) return
  menuSelectionExcerpt.value = bodyEl.value
    ? getSelectionExcerptIn(bodyEl.value)
    : null
  const bubble = event.currentTarget as HTMLElement
  const rect = bubble.getBoundingClientRect()
  openMenuAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
}

function onMenuTriggerClick(event: MouseEvent) {
  event.stopPropagation()
  menuSelectionExcerpt.value = null
  if (menuOpen.value) {
    closeMenu(props.post.id)
    return
  }
  const trigger = menuTriggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  openMenuAt(rect.right, rect.bottom + 4)
}

function requireLogin(action: () => void) {
  if (!props.loggedIn) {
    openAuthModal('login')
    return
  }
  action()
}

async function onCopy() {
  const text = htmlToPlainText(props.post.bodyHtml)
  if (!text) {
    toast.error('Kein Text zum Kopieren.')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Nachricht kopiert.')
  } catch {
    toast.error('Kopieren nicht möglich.')
  }
}

function onMenuSelect(action: DebateMessageMenuAction) {
  switch (action) {
    case 'reply':
      requireLogin(() => emit('reply', props.post.id))
      break
    case 'quote': {
      const excerpt = menuSelectionExcerpt.value
      if (!excerpt) break
      requireLogin(() => {
        emit('quote', {
          postId: props.post.id,
          authorName: props.post.authorName,
          excerpt,
        })
        menuSelectionExcerpt.value = null
        window.getSelection()?.removeAllRanges()
      })
      break
    }
    case 'edit':
      requireLogin(() => emit('edit', props.post.id))
      break
    case 'delete':
      requireLogin(() => emit('delete', props.post.id))
      break
    case 'copy':
      onCopy()
      break
    case 'save':
      requireLogin(() => emit('save', props.post.id))
      break
    case 'report':
      requireLogin(() => emit('report', props.post.id))
      break
  }
}

function isReferenceClickable(ref: DebatePost['references'][number]): boolean {
  if (!ref.available) return false
  if (ref.targetType === 'post') return true
  if (ref.targetType === 'motion_excerpt') return Boolean(referenceExcerptText(ref))
  return isDeliberationReferenceType(ref.targetType)
}

function onReferenceClick(ref: DebatePost['references'][number]) {
  if (!ref.available) return
  if (ref.targetType === 'post') {
    emit('jump', ref.targetId, ref.excerptText)
    return
  }
  if (ref.targetType === 'motion_excerpt') {
    emit('jumpMotionExcerpt', ref.targetId, referenceExcerptText(ref))
    return
  }
  if (isDeliberationReferenceType(ref.targetType)) {
    emit('jumpDeliberation', ref.targetType, ref.targetId)
  }
}

const quoteReferences = computed(() =>
  props.post.references.filter(
    (ref) => ref.targetType === 'post' && ref.excerptText && ref.available,
  ),
)

const motionExcerptReferences = computed(() =>
  props.post.references.filter((ref) => ref.targetType === 'motion_excerpt'),
)

const linkReferences = computed(() =>
  props.post.references.filter(
    (ref) =>
      !(ref.targetType === 'post' && ref.excerptText) &&
      ref.targetType !== 'motion_excerpt',
  ),
)

const showContextRefs = computed(
  () =>
    Boolean(props.parentPreview) ||
    (props.showReferences &&
      (quoteReferences.value.length > 0 ||
        motionExcerptReferences.value.length > 0 ||
        linkReferences.value.length > 0)),
)

function onQuoteReferenceClick(ref: DebatePost['references'][number]) {
  if (!ref.excerptText) return
  emit('jump', ref.targetId, ref.excerptText)
}

function onMotionExcerptReferenceClick(ref: DebatePost['references'][number]) {
  if (!ref.available) return
  emit('jumpMotionExcerpt', ref.targetId, referenceExcerptText(ref))
}

const previewText = computed(() => props.parentPreview?.excerpt ?? '')

const isEdited = computed(() => isPostEdited(props.post))

const editedTooltip = computed(() =>
  props.post.updatedAt
    ? `Zuletzt bearbeitet am ${formatDateTime(props.post.updatedAt)}`
    : '',
)

const authorAffiliation = computed(() =>
  formatAuthorAffiliation(props.post.authorFn, props.post.authorRole),
)

const metaEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)

const timeCollision = ref(false)
const timeReserve = ref(0)

const compactContentStyle = computed(() => {
  if (upvoteCount.value > 0) return undefined
  if (timeCollision.value) {
    return { paddingBottom: `${timeReserve.value}px` }
  }
  return undefined
})

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
  updateTimeCollision()
}

watch(
  [upvoteCount, () => props.post.bodyHtml, () => props.debateOpen],
  updateLayout,
)

watchEffect((onCleanup) => {
  const meta = metaEl.value
  const body = bodyEl.value
  if (!meta) {
    return
  }
  updateLayout()
  const observer = new ResizeObserver(() => updateLayout())
  observer.observe(meta)
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
      'msg--thread-anchor': threadFilterActive,
      'msg--context-upvote': upvoteInContextMenu,
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

        <div
          class="msg__bubble"
          lang="de"
          @contextmenu="onContextMenu"
          @click="onBubbleClick"
        >
          <button
            v-if="menuItems.length > 0"
            ref="menuTriggerRef"
            type="button"
            class="msg__menu-trigger"
            aria-label="Nachrichtenaktionen"
            :aria-expanded="menuOpen"
            @click="onMenuTriggerClick"
          >
            <FontAwesomeIcon icon="ellipsis-vertical" />
          </button>

          <span v-if="!isOwn" class="msg__author">
            <NuxtLink
              v-if="post.authorId"
              :to="`/users/${post.authorId}`"
              class="msg__author-name msg__author-link"
            >
              {{ post.authorName ?? 'Unbekannt' }}
            </NuxtLink>
            <span v-else class="msg__author-name">{{ post.authorName ?? 'Unbekannt' }}</span>
            <span v-if="authorAffiliation" class="msg__author-fn"> · {{ authorAffiliation }}</span>
          </span>
          <ul v-if="showContextRefs" class="msg__refs">
            <li
              v-if="parentPreview"
              class="msg__ref msg__ref--excerpt msg__ref--clickable"
              role="button"
              tabindex="0"
              :aria-label="`Zur Antwort auf ${parentPreview.authorName ?? 'Unbekannt'} springen`"
              @click="emit('jump', parentPreview.postId)"
              @keydown.enter.prevent="emit('jump', parentPreview.postId)"
              @keydown.space.prevent="emit('jump', parentPreview.postId)"
            >
              <div class="msg__ref-header">
                <FontAwesomeIcon class="msg__ref-icon" icon="reply" />
                <span class="msg__ref-type">{{ parentPreview.authorName ?? 'Unbekannt' }}</span>
              </div>
              <div class="msg__ref-body">
                <span class="msg__ref-excerpt">{{ previewText }}</span>
              </div>
            </li>
            <li
              v-for="ref in quoteReferences"
              :key="ref.id"
              class="msg__ref msg__ref--excerpt msg__ref--clickable"
              role="button"
              tabindex="0"
              :aria-label="`Zum Zitat von ${ref.quoteAuthorName ?? 'Unbekannt'} springen`"
              @click="onQuoteReferenceClick(ref)"
              @keydown.enter.prevent="onQuoteReferenceClick(ref)"
              @keydown.space.prevent="onQuoteReferenceClick(ref)"
            >
              <div class="msg__ref-header">
                <FontAwesomeIcon class="msg__ref-icon" icon="quote-left" />
                <span class="msg__ref-type">{{ ref.quoteAuthorName ?? 'Unbekannt' }}</span>
              </div>
              <div class="msg__ref-body">
                <ExpandableExcerpt block :text="referenceExcerptText(ref)" />
              </div>
            </li>
            <li
              v-for="ref in motionExcerptReferences"
              :key="ref.id"
              class="msg__ref msg__ref--excerpt"
              :class="{ 'msg__ref--clickable': ref.available }"
              :role="ref.available ? 'button' : undefined"
              :tabindex="ref.available ? 0 : undefined"
              :aria-label="'Zur Stelle im Antragstext springen'"
              @click="onMotionExcerptReferenceClick(ref)"
              @keydown.enter.prevent="onMotionExcerptReferenceClick(ref)"
              @keydown.space.prevent="onMotionExcerptReferenceClick(ref)"
            >
              <div class="msg__ref-header">
                <FontAwesomeIcon
                  class="msg__ref-icon"
                  :icon="REFERENCE_ICONS.motion_excerpt"
                />
                <span class="msg__ref-type">{{ REFERENCE_TARGET_LABELS.motion_excerpt }}:</span>
              </div>
              <div class="msg__ref-body">
                <ExpandableExcerpt block :text="referenceExcerptText(ref)" />
              </div>
            </li>
            <li
              v-for="ref in linkReferences"
              :key="ref.id"
              class="msg__ref"
              :class="{ 'msg__ref--clickable': isReferenceClickable(ref) }"
              :role="isReferenceClickable(ref) ? 'button' : undefined"
              :tabindex="isReferenceClickable(ref) ? 0 : undefined"
              @click="onReferenceClick(ref)"
              @keydown.enter.prevent="isReferenceClickable(ref) && onReferenceClick(ref)"
              @keydown.space.prevent="isReferenceClickable(ref) && onReferenceClick(ref)"
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
            }"
            :style="compactContentStyle"
          >
            <div ref="bodyEl" class="msg__body">
              <RichText :html="post.bodyHtml" />
            </div>

            <div
              v-if="upvoteCount === 0 && !upvoteInContextMenu"
              class="msg__hover-menu"
            >
              <span class="msg__upvote">
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
              <div class="msg__meta-end">
                <button
                  v-if="showReferences && inboundRefs.length > 0"
                  type="button"
                  class="msg__threadbtn"
                  :class="{ 'msg__threadbtn--active': threadFilterActive }"
                  :aria-pressed="threadFilterActive"
                  :aria-label="`${inboundRefs.length} ${inboundRefs.length === 1 ? 'Bezug' : 'Bezüge'} filtern`"
                  @click="emit('focusThread', post.id)"
                >
                  <FontAwesomeIcon class="msg__threadbtn-icon" icon="reply" />
                  <span class="msg__threadbtn-count">{{ inboundRefs.length }}</span>
                </button>
                <span
                  v-if="isEdited"
                  class="msg__edited"
                  :title="editedTooltip"
                  :aria-label="editedTooltip"
                >
                  <FontAwesomeIcon class="msg__edited-icon" icon="pen" aria-hidden="true" />
                  Bearbeitet
                </span>
                <time class="msg__time" :datetime="post.createdAt">{{ formatChatTime(post.createdAt) }}</time>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DebateMessageContextMenu
        :open="menuOpen"
        :x="menuX"
        :y="menuY"
        :items="menuItems"
        :show-upvote="canShowContextUpvote"
        @close="closeMenu(props.post.id)"
        @select="onMenuSelect"
      >
        <template #upvote>
          <UpvoteButton
            target-type="post"
            :target-id="post.id"
            :count="upvoteCount"
            :upvoted="upvotedByMe"
            size="sm"
            context-label="Beitrag"
            @change="onUpvoteChange"
          />
        </template>
      </DebateMessageContextMenu>
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
.msg__body :deep(.msg__excerpt-mark) {
  background: var(--color-reference-highlight);
  border-radius: 2px;
  box-decoration-break: clone;
  animation: excerpt-mark 2s ease-out;
}
.msg__body.msg__body--quote-target {
  border-radius: var(--radius-sm);
  animation: excerpt-mark 2s ease-out;
}
@keyframes excerpt-mark {
  0%,
  100% {
    box-shadow: none;
  }
  35%,
  55% {
    box-shadow: inset 0 0 0 2px var(--color-reference-outline);
  }
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
  width: auto;
  max-width: 92%;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  overflow-wrap: break-word;
  hyphens: auto;
  -webkit-hyphens: auto;
  --msg-body-size: 0.9rem;
}
.msg__menu-trigger {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.msg__bubble:hover .msg__menu-trigger,
.msg__bubble:focus-within .msg__menu-trigger,
.msg__menu-trigger:focus-visible {
  opacity: 1;
}
.msg__menu-trigger:hover {
  color: var(--color-text);
  background: var(--color-bg);
}
.msg__author {
  display: block;
  margin-bottom: var(--space-1);
  padding-right: 1.25rem;
  font-size: var(--msg-body-size);
  line-height: 1.45;
}
.msg__author-name {
  font-weight: 700;
  color: var(--color-accent);
}
.msg__author-link {
  text-decoration: none;
}
.msg__author-link:hover {
  text-decoration: underline;
}
.msg__author-fn {
  font-weight: 500;
  color: var(--color-text-muted);
}
.msg__body {
  font-size: var(--msg-body-size);
  line-height: 1.45;
}
.msg__body :deep(.rich-text) {
  hyphens: inherit;
  -webkit-hyphens: inherit;
  overflow-wrap: inherit;
}
.msg__body :deep(.rich-text p),
.msg__body :deep(.rich-text li),
.msg__body :deep(.rich-text blockquote) {
  hyphens: inherit;
  -webkit-hyphens: inherit;
  overflow-wrap: inherit;
}
.msg__content--compact {
  position: relative;
  /* Absolute timestamp must fit even when the message text is very short. */
  min-width: 2.85rem;
}
.msg__content--compact:has(.msg__threadbtn) {
  min-width: 5.25rem;
}
.msg__content--compact:has(.msg__edited) {
  min-width: 4.5rem;
}
.msg__content--compact:has(.msg__threadbtn):has(.msg__edited) {
  min-width: 7.5rem;
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
.msg--context-upvote .msg__hover-menu {
  display: none;
}
.msg__upvote {
  display: none;
}
.msg__upvote--shown {
  display: inline-flex;
}
.msg__hover-menu {
  position: absolute;
  left: 0;
  bottom: 0;
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
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.msg__bubble:hover .msg__hover-menu,
.msg__bubble:focus-within .msg__hover-menu {
  opacity: 1;
  pointer-events: auto;
}
.msg__meta--compact .msg__upvote {
  display: none;
}
.msg__hover-menu .msg__upvote {
  display: inline-flex;
}
.msg__hover-menu .msg__upvote :deep(.upvote) {
  border-color: transparent;
  background: transparent;
}
.msg__hover-menu .msg__upvote :deep(.upvote:hover:not(:disabled)) {
  background: var(--color-bg);
}
@media (prefers-reduced-motion: reduce) {
  .msg__hover-menu,
  .msg__menu-trigger {
    transition: none;
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
.msg__edited {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
  font-size: 0.62rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: default;
  user-select: none;
  white-space: nowrap;
}
.msg__edited-icon {
  font-size: 0.58rem;
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
  gap: 0.35rem;
  padding: 0.2rem var(--space-2);
  border-left: 2px solid color-mix(in srgb, var(--color-tertiary) 60%, transparent);
  background: color-mix(in srgb, var(--color-tertiary) 8%, transparent);
  border-radius: var(--radius-sm);
  font-size: var(--msg-body-size);
  line-height: 1.45;
  color: var(--color-text-muted);
}
.msg__ref--excerpt {
  flex-direction: column;
  align-items: stretch;
  gap: 0.15rem;
}
.msg__ref-header {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}
.msg__ref-body {
  min-width: 0;
  padding-left: calc(0.85em + 0.35rem);
  color: var(--color-text);
}
.msg__ref-excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.msg__ref--clickable {
  cursor: pointer;
}
.msg__ref--clickable:hover {
  background: color-mix(in srgb, var(--color-tertiary) 16%, transparent);
}
.msg__ref--clickable:focus-visible {
  outline: 2px solid var(--color-tertiary);
  outline-offset: 2px;
}
.msg__ref-icon {
  flex-shrink: 0;
  font-size: 0.85em;
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
  gap: 0.35rem;
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.msg__threadbtn-count {
  font-weight: 600;
}
.msg__threadbtn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.msg__threadbtn--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg));
}
.msg--thread-anchor .msg__bubble {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 20%, transparent);
}
.msg--highlight .msg__bubble {
  animation: msg-highlight 2s ease-out;
}
@keyframes msg-highlight {
  0%,
  100% {
    box-shadow: none;
    filter: brightness(1);
  }
  35%,
  55% {
    box-shadow:
      0 0 0 2px var(--color-reference-outline),
      0 0 18px color-mix(in srgb, var(--brand-yellow) 35%, transparent);
    filter: brightness(1.04);
  }
}
@media (prefers-reduced-motion: reduce) {
  .msg--highlight .msg__bubble {
    animation: none;
    box-shadow: 0 0 0 2px var(--color-reference-outline);
  }
}
</style>
