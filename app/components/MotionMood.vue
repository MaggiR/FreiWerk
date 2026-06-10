<script setup lang="ts">
import type { MoodChoiceValue } from '#shared/constants'

const props = defineProps<{ motionId: string; canVote: boolean }>()
const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const { data, refresh } = await useFetch(
  () => `/api/motions/${props.motionId}/mood`,
  { key: `mood-${props.motionId}` },
)

const totals = computed(() => ({
  approve: data.value?.totals?.approve ?? 0,
  reject: data.value?.totals?.reject ?? 0,
  abstain: data.value?.totals?.abstain ?? 0,
}))
const totalVotes = computed(() => data.value?.totalVotes ?? 0)
const trend = computed(() => data.value?.trend ?? [])
const userChoice = computed<MoodChoiceValue | null>(
  () => data.value?.userChoice ?? null,
)

const chartView = ref<'ring' | 'bars'>('ring')

const error = ref('')
const voting = ref(false)

async function onVote(choice: MoodChoiceValue) {
  if (choice === userChoice.value) return

  error.value = ''
  voting.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/mood`, {
      method: 'PUT',
      body: { choice },
    })
    await refresh()
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Stimme konnte nicht gespeichert werden.')
  } finally {
    voting.value = false
  }
}
</script>

<template>
  <div class="mood">
    <div v-if="loggedIn && canVote" class="mood__vote">
      <p class="mood__vote-title">Wie ist deine Position?</p>
      <MoodPoll :current="userChoice" :disabled="voting" @vote="onVote" />
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
    <FwCard v-else-if="!loggedIn && canVote" class="mood__login">
      <p>
        <button type="button" class="inline-link" @click="openAuthModal('login')">
          Melde dich an
        </button>, um deine Stimmung abzugeben.
      </p>
    </FwCard>

    <div class="mood__charts">
      <FwCard class="mood__chart-card">
        <div class="mood__chart-head">
          <h3 class="mood__chart-title">
            <FontAwesomeIcon icon="chart-pie" /> Aktuelles Stimmungsbild
          </h3>
          <button
            type="button"
            class="mood__chart-toggle"
            :aria-label="
              chartView === 'ring'
                ? 'Balkendiagramm anzeigen'
                : 'Ringdiagramm anzeigen'
            "
            @click="chartView = chartView === 'ring' ? 'bars' : 'ring'"
          >
            <FontAwesomeIcon
              :icon="chartView === 'ring' ? 'chart-bar' : 'chart-pie'"
            />
          </button>
        </div>
        <ClientOnly>
          <MoodRingChart
            v-if="chartView === 'ring'"
            :totals="totals"
            :total-votes="totalVotes"
          />
          <MoodBreakdownChart
            v-else
            :totals="totals"
            :total-votes="totalVotes"
          />
          <template #fallback><div class="chart-placeholder" /></template>
        </ClientOnly>
      </FwCard>
      <FwCard class="mood__chart-card">
        <div class="mood__chart-head">
          <h3 class="mood__chart-title">
            <FontAwesomeIcon icon="chart-area" /> Zeitlicher Verlauf
          </h3>
          <span class="mood__chart-head-spacer" aria-hidden="true" />
        </div>
        <ClientOnly>
          <MoodTrendChart :trend="trend" />
          <template #fallback><div class="chart-placeholder" /></template>
        </ClientOnly>
      </FwCard>
    </div>
  </div>
</template>

<style scoped>
.mood {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.mood__vote-title {
  font-weight: 700;
  margin: 0 0 var(--space-3);
}
.mood__login {
  color: var(--color-text-muted);
}
.mood__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: var(--space-4);
}

.mood__chart-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mood__chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 2.25rem;
  margin-bottom: var(--space-3);
}

.mood__chart-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  margin: 0;
}

.mood__chart-head-spacer {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
}

.mood__chart-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.12s ease;
}

.mood__chart-toggle:hover {
  color: var(--color-text);
  background: var(--color-bg);
  transform: translateY(-1px);
}

.chart-placeholder {
  height: 260px;
}
@media (max-width: 720px) {
  .mood__charts {
    grid-template-columns: 1fr;
  }
}
</style>
