<script setup lang="ts">
interface DebatePost {
  id: string
  bodyHtml: string
  createdAt: string
  authorId: string
  authorName: string | null
  authorFn: string | null
  authorAvatarUrl: string | null
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
        <NuxtLink :to="`/users/${post.authorId}`" class="post__author">
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
</style>
