<script setup lang="ts">
withDefaults(
  defineProps<{
    avatarUrl: string | null
    name?: string | null
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <span class="user-avatar" :class="`user-avatar--${size}`" aria-hidden="true">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      alt=""
      class="user-avatar__image"
    >
    <FontAwesomeIcon v-else icon="user" class="user-avatar__icon" />
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text-muted);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.user-avatar--sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.9rem;
}

.user-avatar--md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1rem;
}

.user-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
