<script setup lang="ts">
import type { DebatePost } from '~/utils/debate'
import { formatChatTime } from '~/utils/chatDates'

const props = withDefaults(
  defineProps<{
    post: DebatePost
    parentPreview?: { authorName: string | null; excerpt: string } | null
    debateOpen?: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    isOwn?: boolean
  }>(),
  {
    parentPreview: null,
    debateOpen: false,
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
    isOwn: false,
  },
)

const emit = defineEmits<{
  reply: [postId: string]
  report: [postId: string]
  remove: [postId: string]
  react: [postId: string, emoji: string]
}>()

const { open: openAuthModal } = useAuthModal()

const reactions = computed(() => props.post.reactions ?? [])

const canReply = computed(() => props.debateOpen && !props.post.deleted)
const canReport = computed(
  () =>
    props.loggedIn &&
    !props.post.deleted &&
    props.post.authorId !== props.currentUserId,
)
const canReact = computed(() => props.loggedIn && !props.post.deleted)

function onReply() {
  if (!props.loggedIn) {
    openAuthModal('login')
    return
  }
  emit('reply', props.post.id)
}

function onReact(emoji: string) {
  if (!props.loggedIn) {
    openAuthModal('login')
    return
  }
  emit('react', props.post.id, emoji)
}

const previewText = computed(() => props.parentPreview?.excerpt ?? '')
</script>

<template>
  <article
    class="msg"
    :class="{
      'msg--own': isOwn,
      'msg--deleted': post.deleted,
    }"
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

        <div class="msg__bubble">
          <span v-if="!isOwn" class="msg__author">{{ post.authorName ?? 'Unbekannt' }}</span>
          <div v-if="parentPreview" class="msg__quote">
            <FontAwesomeIcon class="msg__quote-icon" icon="reply" />
            <span class="msg__quote-author">{{ parentPreview.authorName ?? 'Unbekannt' }}:</span>
            <span class="msg__quote-text">{{ previewText }}</span>
          </div>
          <div class="msg__body">
            <RichText :html="post.bodyHtml" />
            <time class="msg__time" :datetime="post.createdAt">{{ formatChatTime(post.createdAt) }}</time>
          </div>

          <div v-if="reactions.length > 0" class="msg__reactions">
            <button
              v-for="reaction in reactions"
              :key="reaction.emoji"
              type="button"
              class="msg__reaction"
              :class="{ 'msg__reaction--mine': reaction.reactedByMe }"
              :title="`${reaction.count} Reaktionen`"
              @click="onReact(reaction.emoji)"
            >
              <span class="msg__reaction-emoji">{{ reaction.emoji }}</span>
              <span v-if="reaction.count > 1" class="msg__reaction-count">{{ reaction.count }}</span>
            </button>
          </div>

          <div class="msg__actions">
            <EmojiReactionPicker v-if="canReact" @select="onReact($event)" />
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
  font-weight: 700;
  color: var(--color-accent);
}
.msg__body {
  display: flow-root;
  font-size: 0.9rem;
  line-height: 1.45;
}
/* Inline flow so the timestamp can sit at the end of the last text line when
   space allows, and wrap below only when the line is full (messenger pattern). */
.msg__body :deep(.rich-text) {
  display: inline;
  font-size: inherit;
  line-height: inherit;
}
.msg__body :deep(.rich-text p) {
  display: inline;
  margin: 0;
}
.msg__body :deep(.rich-text p + p::before) {
  content: '\A';
  white-space: pre;
}
.msg__body :deep(.rich-text ul),
.msg__body :deep(.rich-text ol),
.msg__body :deep(.rich-text blockquote),
.msg__body :deep(.rich-text pre) {
  display: block;
  margin: 0 0 var(--space-1);
}
.msg__body :deep(.rich-text ul:last-child),
.msg__body :deep(.rich-text ol:last-child),
.msg__body :deep(.rich-text blockquote:last-child),
.msg__body :deep(.rich-text pre:last-child) {
  margin-bottom: 0;
}
.msg__time {
  float: right;
  clear: right;
  margin-left: 0.45rem;
  margin-top: 0.15rem;
  font-size: 0.65rem;
  line-height: 1.45;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  user-select: none;
  white-space: nowrap;
}
.msg__reactions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.msg__reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.msg__reaction-emoji {
  font-family: var(--font-emoji);
}
.msg__reaction--mine {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-bg));
}
.msg__reaction:hover {
  border-color: var(--color-accent);
}
.msg__reaction-count {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
}
.msg__actions {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  padding: 0.1rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.msg:hover .msg__actions,
.msg:focus-within .msg__actions,
.msg__bubble:hover .msg__actions,
.msg__bubble:focus-within .msg__actions {
  opacity: 1;
  pointer-events: auto;
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
