<script setup lang="ts">
import { DEFAULT_DEBATE_DAYS } from '../../../../shared/constants'

const route = useRoute()
const id = route.params.id as string
const { user, isModerator } = useAuthUser()

const { data, error } = await useFetch(`/api/motions/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)
const watchCount = computed(() => data.value?.watchCount ?? 0)
const isWatched = computed(() => data.value?.isWatched ?? false)

const isAuthor = computed(() => motion.value?.authorId === user.value?.id)
const isDraft = computed(() => motion.value?.status === 'draft')
const isArchived = computed(() => Boolean(motion.value?.archivedAt))
const canArchive = computed(() => isAuthor.value || isModerator.value)

const archivePending = ref(false)
const archiveError = ref('')

async function onArchiveToggle() {
  const archive = !isArchived.value
  if (archive && !confirm('Antrag archivieren? Er erscheint dann nur noch im Archiv.')) {
    return
  }
  archiveError.value = ''
  archivePending.value = true
  try {
    await $fetch(`/api/motions/${id}/archive`, {
      method: 'POST',
      body: { archived: archive },
    })
    await refreshNuxtData()
  } catch (err: unknown) {
    archiveError.value = extractError(err, 'Aktion fehlgeschlagen.')
  } finally {
    archivePending.value = false
  }
}
const debateOpen = computed(() => {
  const m = motion.value
  if (!m || m.status !== 'debate') return false
  return !m.debateEndsAt || new Date(m.debateEndsAt).getTime() > Date.now()
})

useHead({ title: () => `${motion.value?.title ?? 'Antrag'} — FreiWerk` })

const publishPending = ref(false)
const publishError = ref('')

async function onPublish() {
  if (!confirm('Antrag jetzt veröffentlichen? Danach ist keine Bearbeitung mehr möglich.')) {
    return
  }
  publishError.value = ''
  publishPending.value = true
  try {
    await $fetch(`/api/motions/${id}/publish`, {
      method: 'POST',
      body: { debateDays: DEFAULT_DEBATE_DAYS },
    })
    await refreshNuxtData()
  } catch (err: unknown) {
    publishError.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    publishPending.value = false
  }
}
</script>

<template>
  <article v-if="motion" class="motion">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>

    <header class="motion__header">
      <div class="motion__badges">
        <MotionStatusBadge :status="motion.status" />
        <FwBadge tone="tertiary">{{ topicLabel(motion.topic) }}</FwBadge>
        <FwBadge v-if="motion.division?.name" tone="neutral">
          {{ motion.division.name }}
        </FwBadge>
        <FwBadge v-if="isArchived" tone="neutral">
          <FontAwesomeIcon icon="box-archive" /> Archiviert
        </FwBadge>
      </div>

      <h1 class="motion__title">{{ motion.title }}</h1>
      <p class="motion__summary">{{ motion.summary }}</p>

      <div class="motion__meta">
        <NuxtLink
          v-if="motion.authorId && !motion.isAnonymous"
          :to="`/users/${motion.authorId}`"
          class="motion__author-link"
        >
          <FontAwesomeIcon icon="user" /> {{ motion.author?.displayName }}
        </NuxtLink>
        <span v-else>
          <FontAwesomeIcon icon="user" /> Anonym
        </span>
        <span v-if="motion.publishedAt">
          <FontAwesomeIcon icon="clock" /> Veröffentlicht am
          {{ formatDate(motion.publishedAt) }}
        </span>
        <span v-if="motion.status === 'debate' && motion.debateEndsAt">
          <FontAwesomeIcon icon="comments" />
          Debatte {{ timeRemaining(motion.debateEndsAt) }}
        </span>
      </div>

      <div class="motion__actions">
        <WatchButton
          v-if="!isDraft"
          :motion-id="motion.id"
          :watched="isWatched"
          :watch-count="watchCount"
        />
        <template v-if="isAuthor && isDraft">
          <NuxtLink :to="`/motions/${motion.id}/edit`">
            <FwButton variant="secondary">
              <FontAwesomeIcon icon="pen-to-square" /> Entwurf bearbeiten
            </FwButton>
          </NuxtLink>
          <FwButton variant="primary" :disabled="publishPending" @click="onPublish">
            <FontAwesomeIcon icon="paper-plane" />
            {{ publishPending ? 'Veröffentlichen ...' : 'Veröffentlichen' }}
          </FwButton>
        </template>
        <FwButton
          v-if="canArchive && !isDraft"
          variant="ghost"
          :disabled="archivePending"
          @click="onArchiveToggle"
        >
          <FontAwesomeIcon icon="box-archive" />
          {{ isArchived ? 'Aus Archiv holen' : 'Archivieren' }}
        </FwButton>
      </div>
      <p v-if="publishError" class="form-error">{{ publishError }}</p>
      <p v-if="archiveError" class="form-error">{{ archiveError }}</p>
    </header>

    <FwCard class="motion__body">
      <ClientOnly>
        <RichText :html="motion.bodyHtml" collapsible-headings />
        <template #fallback>
          <RichText :html="motion.bodyHtml" />
        </template>
      </ClientOnly>
    </FwCard>

    <section v-if="!isDraft" class="motion__section">
      <h2><FontAwesomeIcon icon="chart-pie" /> Stimmungsbild</h2>
      <MotionMood :motion-id="motion.id" :can-vote="debateOpen" />
    </section>

    <section v-if="!isDraft" class="motion__section">
      <h2><FontAwesomeIcon icon="comments" /> Debatte</h2>
      <MotionDebate :motion-id="motion.id" :debate-open="debateOpen" />
    </section>

    <p v-else class="app-hint motion__hint">
      Dieser Antrag ist noch ein Entwurf. Stimmungsbild und Debatte werden mit der
      Veröffentlichung aktiviert.
    </p>
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
.motion__meta span,
.motion__author-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.motion__author-link {
  color: var(--color-text-muted);
  text-decoration: none;
}
.motion__author-link:hover {
  color: var(--color-accent);
}
.motion__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
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
.motion__hint {
  margin-top: var(--space-2);
}
</style>
