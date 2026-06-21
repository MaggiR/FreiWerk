<script setup lang="ts">
import type { MotionListItem, UserProfilePageData } from '#shared/types'
import { ROLE_LABELS } from '#shared/constants'

const route = useRoute()
const id = route.params.id as string

const { data, error, refresh } = await useFetch<UserProfilePageData>(
  `/api/users/${id}`,
  {
    key: `user-${id}`,
  },
)

const editOpen = ref(false)
const avatarLightboxOpen = ref(false)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Profil nicht gefunden.' })
}

const profile = computed(() => data.value?.user)
const isSelf = computed(() => data.value?.isSelf ?? false)
const canModerate = computed(() => data.value?.canModerate ?? false)
const isBanned = computed(() => Boolean(profile.value?.bannedAt))
const banBusy = ref(false)
const toast = useToast()

async function onBan() {
  const reason = window.prompt('Begründung für die Sperre (für das Protokoll):')
  if (reason === null) return
  if (reason.trim().length < 5) {
    toast.error('Bitte gib eine Begründung (min. 5 Zeichen) an.')
    return
  }
  banBusy.value = true
  try {
    await $fetch(`/api/users/${id}/ban`, { method: 'POST', body: { reason } })
    toast.success('Mitglied gesperrt.')
    await refresh()
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  } finally {
    banBusy.value = false
  }
}

async function onUnban() {
  if (!confirm('Sperre für dieses Mitglied aufheben?')) return
  banBusy.value = true
  try {
    await $fetch(`/api/users/${id}/unban`, { method: 'POST' })
    toast.success('Sperre aufgehoben.')
    await refresh()
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  } finally {
    banBusy.value = false
  }
}
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
          <FwBadge v-if="canModerate && isBanned" tone="neutral">
            <FontAwesomeIcon icon="user-slash" /> Gesperrt
          </FwBadge>
          <FwButton
            v-if="isSelf"
            variant="ghost"
            class="profile__edit"
            aria-label="Profil bearbeiten"
            @click="editOpen = true"
          >
            <FontAwesomeIcon icon="pen-to-square" aria-hidden="true" />
            <span class="profile__edit-label">Bearbeiten</span>
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

    <FwCard v-if="canModerate" class="profile__mod">
      <div class="profile__mod-info">
        <FontAwesomeIcon icon="shield-halved" />
        <span v-if="isBanned">
          Gesperrt am {{ formatDateTime(profile.bannedAt) }}<template v-if="profile.banReason">
            — {{ profile.banReason }}</template>
        </span>
        <span v-else>Dieses Mitglied ist nicht gesperrt.</span>
      </div>
      <FwButton
        :variant="isBanned ? 'ghost' : 'danger'"
        :disabled="banBusy"
        @click="isBanned ? onUnban() : onBan()"
      >
        <FontAwesomeIcon :icon="isBanned ? 'ban' : 'user-slash'" />
        {{ isBanned ? 'Sperre aufheben' : 'Mitglied sperren' }}
      </FwButton>
    </FwCard>

    <section class="section">
      <div class="section__head">
        <h2>
          <FontAwesomeIcon icon="seedling" />
          {{ isSelf ? 'Meine Anträge' : 'Anträge' }}
          <span class="section__count">{{ motions.length }}</span>
        </h2>
      </div>
      <div v-if="motions.length > 0" class="grid">
        <MotionCard v-for="m in motions" :key="m.id" :motion="m" />
      </div>
      <FwCard v-else><p class="muted">Noch keine Anträge.</p></FwCard>
    </section>

    <section v-if="isSelf" class="section">
      <div class="section__head">
        <h2>
          <FontAwesomeIcon icon="star" /> Beobachtete Anträge
          <span class="section__count">{{ watched.length }}</span>
        </h2>
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
.profile__mod {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.profile__mod-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
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
  margin-bottom: var(--space-4);
}
.section__head h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
}
.section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.1rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
.muted {
  color: var(--color-text-muted);
}

@media (max-width: 760px) {
  .profile__head {
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .profile__avatar {
    width: 6rem;
    height: 6rem;
    font-size: 2.5rem;
  }

  .profile__id {
    width: 100%;
    text-align: center;
    position: relative;
    padding-right: 3rem;
  }

  .profile__name-row {
    justify-content: center;
  }

  .profile__name {
    font-size: 1.35rem;
  }

  .profile__edit {
    position: absolute;
    top: 0;
    right: 0;
    margin-left: 0;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
  }

  .profile__edit-label {
    display: none;
  }

  .profile__meta {
    justify-content: center;
  }
}
</style>
