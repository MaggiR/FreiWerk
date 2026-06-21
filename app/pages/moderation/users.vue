<script setup lang="ts">
import { ROLE_LABELS } from '#shared/constants'

definePageMeta({ middleware: 'moderator' })

useHead({ title: 'Sperren — Moderation — FreiWerk' })

const toast = useToast()

const { data, refresh, pending } = await useFetch('/api/moderation/users')
const users = computed(() => data.value?.users ?? [])

const busy = ref<string | null>(null)

async function unban(id: string) {
  if (!confirm('Sperre für dieses Mitglied aufheben?')) return
  busy.value = id
  try {
    await $fetch(`/api/users/${id}/unban`, { method: 'POST' })
    toast.success('Sperre aufgehoben.')
    await refresh()
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="mod">
    <h1 class="mod__title"><FontAwesomeIcon icon="shield-halved" /> Moderation</h1>
    <ModerationNav />

    <p v-if="pending" class="mod__loading">Wird geladen ...</p>
    <p v-else-if="users.length === 0" class="mod__empty">
      Aktuell sind keine Mitglieder gesperrt.
    </p>

    <ul v-else class="mod__list">
      <li v-for="user in users" :key="user.id">
        <FwCard class="ban">
          <div class="ban__head">
            <NuxtLink :to="`/users/${user.id}`" class="ban__name">
              {{ user.displayName }}
            </NuxtLink>
            <FwBadge tone="neutral">{{ ROLE_LABELS[user.role] ?? user.role }}</FwBadge>
          </div>
          <p class="ban__meta">
            Gesperrt am {{ formatDateTime(user.bannedAt) }}
            <template v-if="user.bannedByName"> von {{ user.bannedByName }}</template>
          </p>
          <p v-if="user.banReason" class="ban__reason">{{ user.banReason }}</p>
          <div class="ban__actions">
            <FwButton
              variant="ghost"
              type="button"
              :disabled="busy === user.id"
              @click="unban(user.id)"
            >
              <FontAwesomeIcon icon="ban" /> Sperre aufheben
            </FwButton>
          </div>
        </FwCard>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.mod {
  max-width: 820px;
  margin: 0 auto;
}
.mod__title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
}
.mod__loading,
.mod__empty {
  color: var(--color-text-muted);
}
.mod__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ban__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.ban__name {
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}
.ban__name:hover {
  color: var(--color-accent);
}
.ban__meta {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.88rem;
}
.ban__reason {
  margin: 0 0 var(--space-3);
  white-space: pre-wrap;
}
.ban__actions {
  display: flex;
  gap: var(--space-3);
}
</style>
