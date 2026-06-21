<script setup lang="ts">
import { REPORT_TARGET_LABELS, REPORT_STATUS_LABELS } from '#shared/constants'

definePageMeta({ middleware: 'moderator' })

useHead({ title: 'Meldungen — Moderation — FreiWerk' })

const toast = useToast()

const statusFilter = ref<'open' | 'resolved' | 'dismissed'>('open')

const { data, refresh, pending } = await useFetch('/api/reports', {
  query: computed(() => ({ status: statusFilter.value })),
  key: computed(() => `reports-${statusFilter.value}`),
})

const reports = computed(() => data.value?.reports ?? [])

// Per-report resolution note + busy state, keyed by report id.
const notes = reactive<Record<string, string>>({})
const busy = ref<string | null>(null)

function targetLink(report: { targetType: string; motionId: string | null }): string | null {
  return report.motionId ? `/motions/${report.motionId}` : null
}

async function act(reportId: string, action: 'resolve' | 'dismiss') {
  const resolutionNote = (notes[reportId] ?? '').trim()
  if (resolutionNote.length < 3) {
    toast.error('Bitte gib eine kurze Begründung (min. 3 Zeichen) an.')
    return
  }
  busy.value = reportId
  try {
    await $fetch(`/api/reports/${reportId}/resolve`, {
      method: 'POST',
      body: { action, resolutionNote },
    })
    delete notes[reportId]
    toast.success(action === 'resolve' ? 'Meldung bearbeitet.' : 'Meldung abgewiesen.')
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

    <div class="mod__filters">
      <label
        v-for="option in (['open', 'resolved', 'dismissed'] as const)"
        :key="option"
        class="mod__filter"
        :class="{ 'mod__filter--active': statusFilter === option }"
      >
        <input v-model="statusFilter" type="radio" :value="option" class="visually-hidden">
        {{ REPORT_STATUS_LABELS[option] }}
      </label>
    </div>

    <p v-if="pending" class="mod__loading">Meldungen werden geladen ...</p>
    <p v-else-if="reports.length === 0" class="mod__empty">
      Keine Meldungen in dieser Kategorie.
    </p>

    <ul v-else class="mod__list">
      <li v-for="report in reports" :key="report.id">
        <FwCard class="report">
          <div class="report__head">
            <FwBadge tone="tertiary">{{ REPORT_TARGET_LABELS[report.targetType] }}</FwBadge>
            <FwBadge :tone="report.status === 'open' ? 'primary' : 'neutral'">
              {{ REPORT_STATUS_LABELS[report.status] }}
            </FwBadge>
            <span class="report__meta">
              gemeldet von {{ report.reporterName ?? 'Unbekannt' }} ·
              {{ formatDateTime(report.createdAt) }}
            </span>
          </div>

          <p class="report__reason">{{ report.reason }}</p>

          <div class="report__links">
            <NuxtLink v-if="targetLink(report)" :to="targetLink(report)!" class="report__link">
              <FontAwesomeIcon icon="up-right-from-square" /> Gemeldeten Inhalt öffnen
            </NuxtLink>
          </div>

          <template v-if="report.status === 'open'">
            <label class="field report__note">
              <span>Bearbeitungsnotiz (für das Protokoll)</span>
              <textarea
                v-model="notes[report.id]"
                rows="2"
                maxlength="1000"
                placeholder="Wie wurde die Meldung bearbeitet?"
              />
            </label>
            <div class="report__actions">
              <FwButton
                variant="primary"
                type="button"
                :disabled="busy === report.id"
                @click="act(report.id, 'resolve')"
              >
                <FontAwesomeIcon icon="check" /> Bearbeitet
              </FwButton>
              <FwButton
                variant="ghost"
                type="button"
                :disabled="busy === report.id"
                @click="act(report.id, 'dismiss')"
              >
                <FontAwesomeIcon icon="xmark" /> Abweisen
              </FwButton>
            </div>
          </template>
          <p v-else-if="report.resolutionNote" class="report__resolution">
            <FontAwesomeIcon icon="circle-info" />
            {{ report.resolutionNote }}
            <span class="report__meta"> · {{ formatDateTime(report.resolvedAt) }}</span>
          </p>
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
.mod__filters {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.mod__filter {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.mod__filter--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-contrast);
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
.report__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.report__meta {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.report__reason {
  margin: 0 0 var(--space-3);
  white-space: pre-wrap;
}
.report__links {
  margin-bottom: var(--space-3);
}
.report__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}
.report__note {
  margin-bottom: var(--space-3);
}
.report__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.report__resolution {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.92rem;
}
</style>
