<script setup lang="ts">
import type { MotionListItem } from '#shared/types'

defineProps<{
  motion: MotionListItem
  highlightQuery?: string
}>()

const emit = defineEmits<{
  'watch-changed': [payload: { motionId: string; watched: boolean }]
}>()
</script>

<template>
  <NuxtLink :to="`/motions/${motion.id}`" class="motion-card-link">
    <FwCard class="motion-card">
      <div class="motion-card__top">
        <MotionStatusBadge :status="motion.status" :outcome="motion.outcome" />
        <MotionWatchStar
          :motion-id="motion.id"
          :watched="motion.isWatched ?? false"
          @changed="emit('watch-changed', { motionId: motion.id, watched: $event })"
        />
      </div>

      <h3 class="motion-card__title">
        <HighlightText :text="motion.title" :query="highlightQuery" />
      </h3>

      <p
        v-if="motion.divisionName || motion.topic || motion.archivedAt"
        class="motion-card__context"
      >
        <template v-if="motion.archivedAt">Archiviert</template>
        <template v-if="motion.archivedAt && (motion.divisionName || motion.topic)"> · </template>
        <template v-if="motion.divisionName">{{ motion.divisionName }}</template>
        <template v-if="motion.divisionName && motion.topic"> · </template>
        <template v-if="motion.topic">{{ topicLabel(motion.topic) }}</template>
      </p>

      <p class="motion-card__summary">
        <HighlightText :text="motion.summary" :query="highlightQuery" />
      </p>

      <div class="motion-card__meta">
        <span><FontAwesomeIcon icon="user" /> {{ motion.authorName }}</span>
        <span><FontAwesomeIcon icon="comments" /> {{ motion.postCount }}</span>
        <span :title="`${motion.voteCount} Stimmen`">
          <FontAwesomeIcon icon="chart-column" /> {{ motion.voteCount }}
        </span>
        <MoodBar
          v-if="motion.voteCount > 0"
          :approve="motion.approvalCount"
          :reject="motion.rejectCount"
          :total="motion.voteCount"
        />
        <span v-if="motion.status === 'debate' && motion.debateEndsAt">
          <FontAwesomeIcon icon="clock" /> {{ timeRemaining(motion.debateEndsAt) }}
        </span>
        <span v-else-if="motion.status === 'ballot' && motion.ballotEndsAt">
          <FontAwesomeIcon icon="check-to-slot" />
          Abstimmung {{ timeRemaining(motion.ballotEndsAt) }}
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
.motion-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.motion-card__title,
.motion-card__context,
.motion-card__summary {
  hyphens: auto;
  -webkit-hyphens: auto;
  overflow-wrap: break-word;
}

.motion-card__title {
  margin: 0 0 var(--space-1);
  font-size: 1.15rem;
}
.motion-card__context {
  margin: 0 0 var(--space-2);
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--color-text-muted);
}
.motion-card__summary {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
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
