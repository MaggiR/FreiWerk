<script setup lang="ts">
import type { MotionListItem } from '../../shared/types'

defineProps<{ motion: MotionListItem }>()
</script>

<template>
  <NuxtLink :to="`/motions/${motion.id}`" class="motion-card-link">
    <FwCard class="motion-card">
      <div class="motion-card__head">
        <MotionStatusBadge :status="motion.status" />
        <FwBadge tone="tertiary">{{ topicLabel(motion.topic) }}</FwBadge>
      </div>

      <h3 class="motion-card__title">{{ motion.title }}</h3>
      <p class="motion-card__summary">{{ motion.summary }}</p>

      <div class="motion-card__meta">
        <span><FontAwesomeIcon icon="user" /> {{ motion.authorName }}</span>
        <span><FontAwesomeIcon icon="comments" /> {{ motion.postCount }}</span>
        <MoodBar
          v-if="motion.voteCount > 0"
          :approve="motion.approvalCount"
          :reject="motion.rejectCount"
          :total="motion.voteCount"
        />
        <span v-if="motion.status === 'debate' && motion.debateEndsAt">
          <FontAwesomeIcon icon="clock" /> {{ timeRemaining(motion.debateEndsAt) }}
        </span>
      </div>
    </FwCard>
  </NuxtLink>
</template>

<style scoped>
.motion-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}
.motion-card {
  height: 100%;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.motion-card-link:hover .motion-card {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.motion-card__head {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.motion-card__title {
  margin: 0 0 var(--space-2);
  font-size: 1.15rem;
}
.motion-card__summary {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.motion-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.motion-card__meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
