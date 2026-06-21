<script setup lang="ts">
import type { DebateNode } from '~/utils/debate'

const props = withDefaults(
  defineProps<{
    node: DebateNode
    motionId: string
    debateOpen: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
    depth?: number
  }>(),
  { canModerate: false, loggedIn: false, currentUserId: null, depth: 0 },
)

const emit = defineEmits<{
  created: []
  report: [postId: string]
  remove: [postId: string]
}>()

const { open: openAuthModal } = useAuthModal()

// Cap the visual indentation so deep threads stay readable; nesting is unlimited.
const MAX_INDENT_DEPTH = 5
const indentDepth = computed(() => Math.min(props.depth, MAX_INDENT_DEPTH))

const replyOpen = ref(false)

const post = computed(() => props.node.post)
const canReplyToThis = computed(
  () => props.debateOpen && !post.value.deleted,
)
const canReport = computed(
  () =>
    props.loggedIn &&
    !post.value.deleted &&
    post.value.authorId !== props.currentUserId,
)

function onReplyClick() {
  if (!props.loggedIn) {
    openAuthModal('login')
    return
  }
  replyOpen.value = true
}

function onReplyCreated() {
  replyOpen.value = false
  emit('created')
}
</script>

<template>
  <div class="thread" :class="`thread--depth-${indentDepth}`">
    <FwCard class="post" :class="{ 'post--deleted': post.deleted }">
      <template v-if="post.deleted">
        <p class="post__tombstone">
          <FontAwesomeIcon icon="trash" />
          Dieser Beitrag wurde von der Moderation entfernt.
        </p>
      </template>
      <template v-else>
        <div class="post__head">
          <NuxtLink
            v-if="post.authorId"
            :to="`/users/${post.authorId}`"
            class="post__author"
          >
            <UserAvatar
              :avatar-url="post.authorAvatarUrl"
              :name="post.authorName"
              size="sm"
            />
            <span class="post__author-text">
              <span class="post__author-name">{{ post.authorName ?? 'Unbekannt' }}</span>
              <span v-if="post.authorFn" class="post__author-fn">{{ post.authorFn }}</span>
            </span>
          </NuxtLink>
          <span class="post__date">{{ formatDate(post.createdAt) }}</span>
        </div>
        <RichText :html="post.bodyHtml" />

        <div class="post__actions">
          <button
            v-if="canReplyToThis"
            type="button"
            class="post__action"
            @click="onReplyClick"
          >
            <FontAwesomeIcon icon="reply" /> Antworten
          </button>
          <button
            v-if="canReport"
            type="button"
            class="post__action"
            @click="emit('report', post.id)"
          >
            <FontAwesomeIcon icon="flag" /> Melden
          </button>
          <button
            v-if="canModerate"
            type="button"
            class="post__action post__action--danger"
            @click="emit('remove', post.id)"
          >
            <FontAwesomeIcon icon="trash" /> Entfernen
          </button>
        </div>
      </template>
    </FwCard>

    <PostForm
      v-if="replyOpen"
      :motion-id="motionId"
      :parent-id="post.id"
      reply
      @created="onReplyCreated"
      @cancel="replyOpen = false"
    />

    <div v-if="node.children.length > 0" class="thread__children">
      <PostThread
        v-for="child in node.children"
        :key="child.post.id"
        :node="child"
        :motion-id="motionId"
        :debate-open="debateOpen"
        :can-moderate="canModerate"
        :logged-in="loggedIn"
        :current-user-id="currentUserId"
        :depth="depth + 1"
        @created="emit('created')"
        @report="emit('report', $event)"
        @remove="emit('remove', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.thread {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.thread__children {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
  margin-left: var(--space-4);
  padding-left: var(--space-4);
  border-left: 2px solid var(--color-border);
}
/* Stop indenting past the cap so deeply nested replies stay legible. */
.thread--depth-5 .thread__children {
  margin-left: 0;
  padding-left: var(--space-3);
}
.post--deleted {
  opacity: 0.75;
}
.post__tombstone {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-text-muted);
  font-style: italic;
}
.post__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: 0.88rem;
}
.post__author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
  text-decoration: none;
}
.post__author:hover {
  color: var(--color-accent);
}
.post__author:hover .post__author-fn {
  color: var(--color-text-muted);
}
.post__author-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  line-height: 1.2;
}
.post__author-name {
  font-weight: 700;
}
.post__author-fn {
  font-weight: 500;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.post__date {
  color: var(--color-text-muted);
}
.post__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-3);
}
.post__action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}
.post__action:hover {
  color: var(--color-accent);
}
.post__action--danger:hover {
  color: var(--color-danger);
}
</style>
