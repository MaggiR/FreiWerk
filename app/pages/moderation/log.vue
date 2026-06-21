<script setup lang="ts">
import { MODERATION_ACTION_LABELS } from '#shared/constants'

definePageMeta({ middleware: 'moderator' })

useHead({ title: 'Protokoll — Moderation — FreiWerk' })

const { data, pending } = await useFetch('/api/moderation/actions')
const actions = computed(() => data.value?.actions ?? [])

function actionIcon(action: string): string {
  const icons: Record<string, string> = {
    post_removed: 'trash',
    user_banned: 'user-slash',
    user_unbanned: 'ban',
    report_resolved: 'check',
    report_dismissed: 'xmark',
    motion_archived: 'box-archive',
    motion_unarchived: 'box-archive',
    ballot_finalized: 'check-to-slot',
  }
  return icons[action] ?? 'gavel'
}

function targetPath(action: {
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
}): string | null {
  if (action.targetType === 'motion') return `/motions/${action.targetId}`
  if (action.targetType === 'user') return `/users/${action.targetId}`
  const motionId = action.metadata?.motionId
  if (typeof motionId === 'string') return `/motions/${motionId}`
  return null
}
</script>

<template>
  <section class="mod">
    <h1 class="mod__title"><FontAwesomeIcon icon="shield-halved" /> Moderation</h1>
    <ModerationNav />

    <p v-if="pending" class="mod__loading">Protokoll wird geladen ...</p>
    <p v-else-if="actions.length === 0" class="mod__empty">
      Noch keine protokollierten Aktionen.
    </p>

    <ol v-else class="log">
      <li v-for="entry in actions" :key="entry.id" class="log__item">
        <span class="log__icon"><FontAwesomeIcon :icon="actionIcon(entry.action)" /></span>
        <div class="log__body">
          <p class="log__action">
            {{ MODERATION_ACTION_LABELS[entry.action] ?? entry.action }}
            <span class="log__by">durch {{ entry.actorName ?? 'System' }}</span>
          </p>
          <p v-if="entry.reason" class="log__reason">{{ entry.reason }}</p>
          <p class="log__meta">
            {{ formatDateTime(entry.createdAt) }}
            <template v-if="targetPath(entry)">
              ·
              <NuxtLink :to="targetPath(entry)!" class="log__link">Ziel öffnen</NuxtLink>
            </template>
          </p>
        </div>
      </li>
    </ol>
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
.log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.log__item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.log__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
}
.log__body {
  min-width: 0;
}
.log__action {
  margin: 0;
  font-weight: 600;
}
.log__by {
  font-weight: 400;
  color: var(--color-text-muted);
}
.log__reason {
  margin: var(--space-1) 0 0;
  white-space: pre-wrap;
}
.log__meta {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.log__link {
  color: var(--color-accent);
}
</style>
