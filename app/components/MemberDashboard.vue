<script setup lang="ts">
import type { MotionListItem } from '#shared/types'

const { user } = useAuthUser()

const { data: hot } = await useFetch('/api/motions', {
  query: { sort: 'active', status: 'debate' },
  key: 'home-hot',
})
const { data: controversial } = await useFetch('/api/motions', {
  query: { sort: 'controversial', status: 'debate' },
  key: 'home-controversial',
})
const { data: recent } = await useFetch('/api/motions', {
  query: { sort: 'recent', publishedOnly: 'true' },
  key: 'home-recent',
})
const { data: mine } = await useFetch('/api/motions', {
  query: computed(() => ({ authorId: user.value?.id })),
  key: 'home-mine',
})
const { data: watchedData } = await useFetch('/api/motions', {
  query: { watched: 'true' },
  key: 'home-watched',
})
const { data: ballotPendingData } = await useFetch('/api/motions', {
  query: { ballotPending: 'true' },
  key: 'home-ballot-pending',
})

const TOP_COUNT = 6

const hotMotions = computed<MotionListItem[]>(
  () => (hot.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)
const controversialMotions = computed<MotionListItem[]>(
  () => (controversial.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)
const recentMotions = computed<MotionListItem[]>(
  () => (recent.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)
const myMotions = computed<MotionListItem[]>(
  () => (mine.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)
const watchedMotions = computed<MotionListItem[]>(
  () => (watchedData.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)
const pendingBallotMotions = computed<MotionListItem[]>(
  () =>
    (ballotPendingData.value?.motions ?? []).slice(0, TOP_COUNT) as MotionListItem[],
)

const myMotionsTo = computed(() => ({
  path: '/motions',
  query: user.value?.id ? { authorId: user.value.id } : {},
}))

function onWatchedCardChange({ watched }: { motionId: string; watched: boolean }) {
  if (!watched) refreshNuxtData('home-watched')
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__content">
        <FwBadge tone="primary">Beteiligungsplattform</FwBadge>
        <h1 class="hero__title">Willkommen zurück, {{ user?.displayName }}</h1>
        <p class="hero__lead">
          Bring politische Anträge ein, debattiere strukturiert und mach
          Unterstützung sichtbar — offen, transparent und verbindlich.
        </p>
      </div>
      <div class="hero__actions">
        <NuxtLink to="/motions/new" class="hero__action">
          <FwButton variant="primary" block>
            <FontAwesomeIcon icon="plus" />
            Antrag stellen
          </FwButton>
        </NuxtLink>
        <NuxtLink to="/motions" class="hero__action">
          <FwButton variant="ghost" block>Anträge entdecken</FwButton>
        </NuxtLink>
      </div>
    </section>

    <section v-if="myMotions.length > 0" class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="seedling" /> Deine Anträge</h2>
        <NuxtLink :to="myMotionsTo">Alle anzeigen</NuxtLink>
      </div>
      <MotionCarousel :motions="myMotions" />
    </section>

    <section v-if="watchedMotions.length > 0" class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="star" /> Beobachtete Anträge</h2>
        <NuxtLink to="/motions?watched=true">Alle anzeigen</NuxtLink>
      </div>
      <MotionCarousel :motions="watchedMotions" @watch-changed="onWatchedCardChange" />
    </section>

    <section v-if="pendingBallotMotions.length > 0" class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="check-to-slot" /> Noch abzustimmen</h2>
        <NuxtLink to="/motions?ballotPending=true">Alle anzeigen</NuxtLink>
      </div>
      <MotionCarousel :motions="pendingBallotMotions" />
    </section>

    <section class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="fire" /> Heiß debattiert</h2>
        <NuxtLink to="/motions?sort=active&status=debate">Mehr</NuxtLink>
      </div>
      <MotionCarousel v-if="hotMotions.length > 0" :motions="hotMotions" />
      <FwCard v-else><p>Aktuell keine laufenden Debatten.</p></FwCard>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>
          <FontAwesomeIcon icon="down-left-and-up-right-to-center" /> Kontroverseste
        </h2>
        <NuxtLink to="/motions?sort=controversial&status=debate">Mehr</NuxtLink>
      </div>
      <MotionCarousel
        v-if="controversialMotions.length > 0"
        :motions="controversialMotions"
      />
      <FwCard v-else><p>Aktuell keine kontroversen Debatten mit ausgewogener Zustimmung und Ablehnung.</p></FwCard>
    </section>

    <section class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="clock" /> Neueste Anträge</h2>
        <NuxtLink to="/motions">Alle Anträge</NuxtLink>
      </div>
      <MotionCarousel v-if="recentMotions.length > 0" :motions="recentMotions" />
      <FwCard v-else><p>Noch keine veröffentlichten Anträge.</p></FwCard>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}
.hero {
  position: relative;
  overflow: hidden;
  background: var(--gradient-hero);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-7) var(--space-6);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: center;
}
.hero__content {
  max-width: 640px;
}
.hero__title {
  font-size: clamp(2rem, 5vw, 3rem);
  margin: var(--space-3) 0;
}
.hero__lead {
  font-size: 1.2rem;
  color: var(--color-text-muted);
  margin: 0;
}
.hero__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.hero__action {
  display: block;
}

@media (min-width: 880px) {
  .hero {
    grid-template-columns: minmax(0, 1.6fr) minmax(15rem, 1fr);
    gap: var(--space-8);
    padding: var(--space-7) var(--space-8);
  }
  .hero__actions {
    position: relative;
    padding: var(--space-5);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    box-shadow: var(--shadow-md);
  }
  .hero__actions :deep(.fw-btn) {
    font-size: 1.05rem;
    padding: var(--space-4) var(--space-5);
  }
}
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.section__head h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
}
</style>
