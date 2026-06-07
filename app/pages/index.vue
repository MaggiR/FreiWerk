<script setup lang="ts">
import type { MotionListItem } from '../../shared/types'

const { loggedIn, user } = useAuthUser()

useHead({ title: 'FreiWerk — Marktplatz liberaler Ideen' })

const { data: hot } = await useFetch('/api/motions', {
  query: { sort: 'active', status: 'debate' },
  key: 'home-hot',
})
const { data: recent } = await useFetch('/api/motions', {
  query: { sort: 'recent' },
  key: 'home-recent',
})

const { data: mine } = await useFetch('/api/motions', {
  query: computed(() => ({ authorId: user.value?.id })),
  key: 'home-mine',
  immediate: false,
})

watch(
  loggedIn,
  (val) => {
    if (val) refreshNuxtData('home-mine')
  },
  { immediate: true },
)

const hotMotions = computed<MotionListItem[]>(
  () => (hot.value?.motions ?? []).slice(0, 3) as MotionListItem[],
)
const recentMotions = computed<MotionListItem[]>(
  () => (recent.value?.motions ?? []).slice(0, 6) as MotionListItem[],
)
const myMotions = computed<MotionListItem[]>(
  () => (mine.value?.motions ?? []).slice(0, 3) as MotionListItem[],
)
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__content">
        <FwBadge tone="primary">Beteiligungsplattform</FwBadge>
        <h1 class="hero__title">Der Marktplatz liberaler Ideen</h1>
        <p class="hero__lead">
          Bring politische Anträge ein, debattiere strukturiert und mach
          Unterstützung sichtbar — offen, transparent und verbindlich.
        </p>
        <div class="hero__actions">
          <NuxtLink :to="loggedIn ? '/motions/new' : '/auth/register'">
            <FwButton variant="primary">
              <FontAwesomeIcon icon="plus" />
              {{ loggedIn ? 'Antrag stellen' : 'Jetzt mitmachen' }}
            </FwButton>
          </NuxtLink>
          <NuxtLink to="/motions">
            <FwButton variant="ghost">Anträge entdecken</FwButton>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="loggedIn && myMotions.length > 0" class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="seedling" /> Deine Anträge</h2>
        <NuxtLink :to="`/motions?authorId=${user?.id}`">Alle anzeigen</NuxtLink>
      </div>
      <div class="grid">
        <MotionCard v-for="m in myMotions" :key="m.id" :motion="m" />
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="fire" /> Heiß debattiert</h2>
        <NuxtLink to="/motions?sort=active&status=debate">Mehr</NuxtLink>
      </div>
      <div v-if="hotMotions.length > 0" class="grid">
        <MotionCard v-for="m in hotMotions" :key="m.id" :motion="m" />
      </div>
      <FwCard v-else><p>Aktuell keine laufenden Debatten.</p></FwCard>
    </section>

    <section class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="clock" /> Neueste Anträge</h2>
        <NuxtLink to="/motions">Alle Anträge</NuxtLink>
      </div>
      <div v-if="recentMotions.length > 0" class="grid">
        <MotionCard v-for="m in recentMotions" :key="m.id" :motion="m" />
      </div>
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
  background: var(--gradient-hero);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8) var(--space-6);
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
  margin-bottom: var(--space-5);
}
.hero__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
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
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
</style>
