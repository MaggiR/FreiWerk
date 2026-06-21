<script setup lang="ts">
import { buildThreadTree, type DebatePost } from '~/utils/debate'

const props = withDefaults(
  defineProps<{
    posts: DebatePost[]
    motionId: string
    topSort?: 'recent' | 'oldest'
    debateOpen?: boolean
    canModerate?: boolean
    loggedIn?: boolean
    currentUserId?: string | null
  }>(),
  {
    topSort: 'oldest',
    debateOpen: false,
    canModerate: false,
    loggedIn: false,
    currentUserId: null,
  },
)

const emit = defineEmits<{
  created: []
  report: [postId: string]
  remove: [postId: string]
}>()

const tree = computed(() => buildThreadTree(props.posts, props.topSort))
</script>

<template>
  <div class="post-list">
    <p v-if="posts.length === 0" class="post-list__empty">
      Noch keine Beiträge. Sei die erste Person, die mitdiskutiert.
    </p>

    <PostThread
      v-for="node in tree"
      :key="node.post.id"
      :node="node"
      :motion-id="motionId"
      :debate-open="debateOpen"
      :can-moderate="canModerate"
      :logged-in="loggedIn"
      :current-user-id="currentUserId"
      @created="emit('created')"
      @report="emit('report', $event)"
      @remove="emit('remove', $event)"
    />
  </div>
</template>

<style scoped>
.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.post-list__empty {
  color: var(--color-text-muted);
}
</style>
