<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const { user } = useAuthUser()

const { data, error } = await useFetch(`/api/motions/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

const isAuthor = computed(() => motion.value?.authorId === user.value?.id)
const isDraft = computed(() => motion.value?.status === 'draft')
const debateOpen = computed(() => {
  const m = motion.value
  if (!m || m.status !== 'debate') return false
  return !m.debateEndsAt || new Date(m.debateEndsAt).getTime() > Date.now()
})

useHead({ title: () => `${motion.value?.title ?? 'Antrag'} — FreiWerk` })
</script>

<template>
  <article v-if="motion" class="motion">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>

    <header class="motion__header">
      <div class="motion__badges">
        <FwBadge tone="tertiary">{{ topicLabel(motion.topic) }}</FwBadge>
        <FwBadge :tone="motion.status === 'debate' ? 'secondary' : 'neutral'">
          {{ statusLabel(motion.status) }}
        </FwBadge>
        <FwBadge v-if="motion.division?.name" tone="neutral">
          {{ motion.division.name }}
        </FwBadge>
      </div>

      <h1 class="motion__title">{{ motion.title }}</h1>
      <p class="motion__summary">{{ motion.summary }}</p>

      <div class="motion__meta">
        <span><FontAwesomeIcon icon="user" /> {{ motion.author?.displayName }}</span>
        <span v-if="motion.publishedAt">
          <FontAwesomeIcon icon="clock" /> Veröffentlicht am
          {{ formatDate(motion.publishedAt) }}
        </span>
        <span v-if="motion.status === 'debate' && motion.debateEndsAt">
          <FontAwesomeIcon icon="comments" />
          Debatte {{ timeRemaining(motion.debateEndsAt) }}
        </span>
      </div>

      <div v-if="isAuthor && isDraft" class="motion__author-actions">
        <NuxtLink :to="`/motions/${motion.id}/edit`">
          <FwButton variant="secondary">
            <FontAwesomeIcon icon="pen-to-square" /> Entwurf bearbeiten
          </FwButton>
        </NuxtLink>
      </div>
    </header>

    <FwCard class="motion__body">
      <RichText :html="motion.bodyHtml" />
    </FwCard>

    <section v-if="!isDraft" class="motion__section">
      <h2><FontAwesomeIcon icon="chart-pie" /> Stimmungsbild</h2>
      <MotionMood :motion-id="motion.id" :can-vote="debateOpen" />
    </section>

    <section v-if="!isDraft" class="motion__section">
      <h2><FontAwesomeIcon icon="comments" /> Debatte</h2>
      <MotionDebate :motion-id="motion.id" :debate-open="debateOpen" />
    </section>

    <FwCard v-else class="motion__draft-note">
      <p>
        Dieser Antrag ist noch ein Entwurf. Stimmungsbild und Debatte werden mit
        der Veröffentlichung aktiviert.
      </p>
    </FwCard>
  </article>
</template>

<style scoped>
.motion {
  max-width: 820px;
  margin: 0 auto;
}
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}
.motion__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.motion__title {
  margin: 0 0 var(--space-3);
  font-size: 2rem;
}
.motion__summary {
  font-size: 1.15rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-4);
}
.motion__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}
.motion__meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.motion__author-actions {
  margin-bottom: var(--space-4);
}
.motion__body {
  margin-bottom: var(--space-6);
}
.motion__section {
  margin-bottom: var(--space-7);
}
.motion__section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
</style>
