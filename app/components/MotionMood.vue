<script setup lang="ts">
import type { MoodPollChoice, MoodChoiceValue } from '../../shared/constants'

const props = defineProps<{ motionId: string; canVote: boolean }>()
const { loggedIn } = useAuthUser()
const { clear } = useUserSession()

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
const userChoice = computed<MoodPollChoice | null>(() => {
  const choice = data.value?.userChoice as MoodChoiceValue | null | undefined
  if (choice === 'undecided' || choice == null) return null
  return choice
})

const supportPercent = computed(() =>
  approvalRatio(totals.value.approve, totalVotes.value),
)

const error = ref('')
const voting = ref(false)

async function onVote(choice: MoodPollChoice) {
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
      await clear()
      await navigateTo('/auth/login')
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
    <div class="mood__stats">
      <FwCard class="mood__stat">
        <span class="mood__stat-value">{{ totalVotes }}</span>
        <span class="mood__stat-label">Beteiligungen</span>
      </FwCard>
      <FwCard class="mood__stat">
        <span class="mood__stat-value">{{ supportPercent }}%</span>
        <span class="mood__stat-label">Zustimmung</span>
      </FwCard>
    </div>

    <div v-if="loggedIn && canVote" class="mood__vote">
      <p class="mood__vote-title">Wie ist deine Position?</p>
      <MoodPoll :current="userChoice" :disabled="voting" @vote="onVote" />
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
    <FwCard v-else-if="!loggedIn && canVote" class="mood__login">
      <p>
        <NuxtLink to="/auth/login">Melde dich an</NuxtLink>, um deine Stimmung
        abzugeben.
      </p>
    </FwCard>

    <div class="mood__charts">
      <FwCard>
        <h3 class="mood__chart-title">
          <FontAwesomeIcon icon="chart-pie" /> Aktuelles Stimmungsbild
        </h3>
        <ClientOnly>
          <MoodRingChart :totals="totals" />
          <template #fallback><div class="chart-placeholder" /></template>
        </ClientOnly>
      </FwCard>
      <FwCard>
        <h3 class="mood__chart-title">
          <FontAwesomeIcon icon="chart-area" /> Zeitlicher Verlauf
        </h3>
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
.mood__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.mood__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.mood__stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
}
.mood__stat-label {
  color: var(--color-text-muted);
  font-size: 0.9rem;
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
  gap: var(--space-4);
}
.mood__chart-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  margin: 0 0 var(--space-3);
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
