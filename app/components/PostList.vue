<script setup lang="ts">
interface DebatePost {
  id: string
  bodyHtml: string
  createdAt: string
  authorId: string
  authorName: string | null
}

defineProps<{ posts: DebatePost[] }>()
</script>

<template>
  <div class="post-list">
    <p v-if="posts.length === 0" class="post-list__empty">
      Noch keine Beiträge. Sei die erste Person, die mitdiskutiert.
    </p>

    <FwCard v-for="post in posts" :key="post.id" class="post">
      <div class="post__head">
        <span class="post__author">
          <FontAwesomeIcon icon="user" /> {{ post.authorName ?? 'Unbekannt' }}
        </span>
        <span class="post__date">{{ formatDate(post.createdAt) }}</span>
      </div>
      <RichText :html="post.bodyHtml" />
    </FwCard>
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
.post__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: 0.88rem;
}
.post__author {
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.post__date {
  color: var(--color-text-muted);
}
</style>
