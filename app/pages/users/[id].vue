<script setup lang="ts">
import type { MotionListItem } from '../../../shared/types'
import { ROLE_LABELS } from '../../../shared/constants'

const route = useRoute()
const id = route.params.id as string

const { data, error, refresh } = await useFetch(`/api/users/${id}`, {
  key: `user-${id}`,
})

const editOpen = ref(false)
const avatarLightboxOpen = ref(false)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Profil nicht gefunden.' })
}

const profile = computed(() => data.value?.user)
const isSelf = computed(() => data.value?.isSelf ?? false)
const motions = computed<MotionListItem[]>(
  () => (data.value?.motions ?? []) as MotionListItem[],
)
const watched = computed<MotionListItem[]>(
  () => (data.value?.watched ?? []) as MotionListItem[],
)

const roleTone = computed(() => {
  switch (profile.value?.role) {
    case 'admin':
      return 'primary'
    case 'moderator':
      return 'tertiary'
    default:
      return 'neutral'
  }
})

useHead({ title: () => `${profile.value?.displayName ?? 'Profil'} — FreiWerk` })

async function onProfileSaved() {
  await refresh()
}

async function onWatchedCardChange({ watched }: { motionId: string; watched: boolean }) {
  if (!watched) await refresh()
}
</script>

<template>
  <div v-if="profile" class="profile">
    <FwCard class="profile__head" glass>
      <button
        v-if="profile.avatarUrl"
        type="button"
        class="profile__avatar profile__avatar--clickable"
        :aria-label="`Profilbild von ${profile.displayName} vergrößern`"
        @click="avatarLightboxOpen = true"
      >
        <img
          :src="profile.avatarUrl"
          alt=""
          class="profile__avatar-image"
        >
      </button>
      <div v-else class="profile__avatar" aria-hidden="true">
        <FontAwesomeIcon icon="user" />
      </div>
      <div class="profile__id">
        <div class="profile__name-row">
          <h1 class="profile__name">{{ profile.displayName }}</h1>
          <FwBadge :tone="roleTone">{{ ROLE_LABELS[profile.role] ?? profile.role }}</FwBadge>
          <FwButton
            v-if="isSelf"
            variant="ghost"
            class="profile__edit"
            @click="editOpen = true"
          >
            <FontAwesomeIcon icon="pen-to-square" />
            Bearbeiten
          </FwButton>
        </div>
        <p v-if="profile.fn" class="profile__fn">{{ profile.fn }}</p>
        <div class="profile__meta">
          <span v-if="profile.division?.name">
            <FontAwesomeIcon icon="layer-group" /> {{ profile.division.name }}
          </span>
          <span>
            <FontAwesomeIcon icon="calendar" /> Dabei seit {{ formatDate(profile.createdAt) }}
          </span>
        </div>
      </div>
    </FwCard>

    <section class="section">
      <div class="section__head">
        <h2>
          <FontAwesomeIcon icon="seedling" />
          {{ isSelf ? 'Meine Anträge' : 'Anträge' }}
        </h2>
        <span class="muted">{{ motions.length }}</span>
      </div>
      <div v-if="motions.length > 0" class="grid">
        <MotionCard v-for="m in motions" :key="m.id" :motion="m" />
      </div>
      <FwCard v-else><p class="muted">Noch keine Anträge.</p></FwCard>
    </section>

    <section v-if="isSelf" class="section">
      <div class="section__head">
        <h2><FontAwesomeIcon icon="star" /> Beobachtete Anträge</h2>
        <span class="muted">{{ watched.length }}</span>
      </div>
      <div v-if="watched.length > 0" class="grid">
        <MotionCard
          v-for="m in watched"
          :key="m.id"
          :motion="m"
          @watch-changed="onWatchedCardChange"
        />
      </div>
      <FwCard v-else>
        <p class="muted">
          Du beobachtest noch keine Anträge. Öffne einen Antrag und klicke auf „Beobachten“.
        </p>
      </FwCard>
    </section>

    <ProfileEditModal
      v-if="isSelf"
      :open="editOpen"
      :profile="profile"
      @close="editOpen = false"
      @saved="onProfileSaved"
    />

    <ImageLightbox
      v-if="profile.avatarUrl"
      :open="avatarLightboxOpen"
      :src="profile.avatarUrl"
      :alt="`Profilbild von ${profile.displayName}`"
      @close="avatarLightboxOpen = false"
    />
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}
.profile__head {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.profile__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 7.5rem;
  height: 7.5rem;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 3rem;
  overflow: hidden;
}
.profile__avatar--clickable {
  padding: 0;
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  transition: transform 0.12s ease, box-shadow 0.2s ease;
}
.profile__avatar--clickable:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.profile__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile__edit {
  margin-left: auto;
}
.profile__id {
  flex: 1;
  min-width: 0;
}
.profile__name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  width: 100%;
}
.profile__name {
  margin: 0;
  font-size: 1.6rem;
}
.profile__fn {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
}
.profile__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-3);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.profile__meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
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
.muted {
  color: var(--color-text-muted);
}
</style>
