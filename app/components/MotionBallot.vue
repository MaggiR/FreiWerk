<script setup lang="ts">
import {
  BALLOT_CHOICES,
  BALLOT_LABELS,
  type BallotChoiceValue,
} from '#shared/constants'

const props = defineProps<{
  motionId: string
  /** Author or moderator: may finalize the ballot once the deadline passes. */
  canManage: boolean
}>()

const emit = defineEmits<{ changed: [] }>()

const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const { data, refresh } = await useFetch(
  () => `/api/motions/${props.motionId}/ballot`,
  { key: `ballot-${props.motionId}` },
)

const status = computed(() => data.value?.status ?? 'ballot')
const ballotEndsAt = computed(() => data.value?.ballotEndsAt ?? null)
const outcome = computed(() => data.value?.outcome ?? null)
const participantCount = computed(() => data.value?.participantCount ?? 0)
const hasVoted = computed(() => data.value?.hasVoted ?? false)
const totals = computed(() => ({
  approve: data.value?.totals?.approve ?? 0,
  reject: data.value?.totals?.reject ?? 0,
  abstain: data.value?.totals?.abstain ?? 0,
}))
const totalVotes = computed(() => data.value?.totalVotes ?? 0)

const deadlinePassed = computed(() => {
  const end = ballotEndsAt.value
  return Boolean(end && new Date(end).getTime() <= Date.now())
})
const votingOpen = computed(
  () => status.value === 'ballot' && !deadlinePassed.value,
)

const ICONS: Record<BallotChoiceValue, string> = {
  approve: 'thumbs-up',
  reject: 'thumbs-down',
  abstain: 'circle-half-stroke',
}

const error = ref('')
const voting = ref(false)

async function onVote(choice: BallotChoiceValue) {
  error.value = ''
  voting.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/ballot/vote`, {
      method: 'POST',
      body: { choice },
    })
    await refresh()
    emit('changed')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Stimme konnte nicht abgegeben werden.')
  } finally {
    voting.value = false
  }
}

const finalizing = ref(false)

async function onFinalize() {
  if (!confirm('Abstimmung jetzt auswerten und Ergebnis festschreiben?')) return
  error.value = ''
  finalizing.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/ballot/finalize`, {
      method: 'POST',
    })
    await refresh()
    emit('changed')
  } catch (err: unknown) {
    error.value = extractError(err, 'Auswertung fehlgeschlagen.')
  } finally {
    finalizing.value = false
  }
}
</script>

<template>
  <div class="ballot">
    <!-- Decided: reveal the secret tally and outcome. -->
    <template v-if="status === 'decided'">
      <div class="ballot__result" :class="`ballot__result--${outcome}`">
        <FontAwesomeIcon
          :icon="outcome === 'accepted' ? 'circle-check' : 'circle-xmark'"
          class="ballot__result-icon"
        />
        <div>
          <p class="ballot__result-title">{{ outcomeLabel(outcome) }}</p>
          <p class="ballot__result-sub">
            Geheime Schlussabstimmung mit {{ totalVotes }}
            {{ totalVotes === 1 ? 'Stimme' : 'Stimmen' }}
          </p>
        </div>
      </div>
      <FwCard class="ballot__chart-card">
        <ClientOnly>
          <MoodRingChart :totals="totals" :total-votes="totalVotes" />
          <template #fallback><div class="chart-placeholder" /></template>
        </ClientOnly>
      </FwCard>
    </template>

    <!-- Active or awaiting evaluation. -->
    <template v-else>
      <FwCard class="ballot__panel">
        <p class="ballot__lead">
          <FontAwesomeIcon icon="lock" />
          Geheime Abstimmung — deine Stimme wird nicht mit deinem Profil verknüpft.
        </p>
        <p class="ballot__meta">
          <span>
            <FontAwesomeIcon icon="user-group" />
            {{ participantCount }}
            {{ participantCount === 1 ? 'Stimme abgegeben' : 'Stimmen abgegeben' }}
          </span>
          <span v-if="ballotEndsAt && !deadlinePassed">
            <FontAwesomeIcon icon="clock" /> {{ timeRemaining(ballotEndsAt) }}
          </span>
        </p>

        <div v-if="votingOpen && loggedIn && !hasVoted" class="ballot__vote">
          <div class="ballot__choices">
            <button
              v-for="choice in BALLOT_CHOICES"
              :key="choice"
              type="button"
              class="ballot__btn"
              :class="`ballot__btn--${choice}`"
              :disabled="voting"
              @click="onVote(choice)"
            >
              <FontAwesomeIcon :icon="ICONS[choice]" />
              <span>{{ BALLOT_LABELS[choice] }}</span>
            </button>
          </div>
          <p class="ballot__hint">
            Die Stimmabgabe ist endgültig und kann nicht geändert werden.
          </p>
        </div>

        <p v-else-if="votingOpen && hasVoted" class="ballot__voted">
          <FontAwesomeIcon icon="circle-check" />
          Du hast abgestimmt. Das Ergebnis wird nach Ende der Frist veröffentlicht.
        </p>

        <p v-else-if="votingOpen && !loggedIn" class="ballot__login">
          <button type="button" class="inline-link" @click="openAuthModal('login')">
            Melde dich an
          </button>, um an der Abstimmung teilzunehmen.
        </p>

        <div v-else class="ballot__closed">
          <p>
            <FontAwesomeIcon icon="hourglass-end" />
            Die Abstimmungsfrist ist abgelaufen. Das Ergebnis wird nach der
            Auswertung veröffentlicht.
          </p>
          <FwButton
            v-if="canManage"
            variant="primary"
            :disabled="finalizing"
            @click="onFinalize"
          >
            {{ finalizing ? 'Auswerten ...' : 'Abstimmung auswerten' }}
          </FwButton>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
      </FwCard>
    </template>
  </div>
</template>

<style scoped>
.ballot {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.ballot__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ballot__lead {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  margin: 0;
}
.ballot__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.ballot__meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.ballot__choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-3);
}
.ballot__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.2s ease, background 0.2s ease,
    color 0.2s ease;
}
.ballot__btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.ballot__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ballot__btn :deep(svg) {
  font-size: 1.4rem;
}
.ballot__btn--approve:hover:not(:disabled) {
  border-color: var(--mood-approve);
  color: var(--mood-approve);
}
.ballot__btn--reject:hover:not(:disabled) {
  border-color: var(--mood-reject);
  color: var(--mood-reject);
}
.ballot__btn--abstain:hover:not(:disabled) {
  border-color: var(--mood-abstain);
  color: var(--mood-abstain);
}
.ballot__hint,
.ballot__voted,
.ballot__login {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.ballot__voted {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--mood-approve);
  font-weight: 600;
}
.ballot__closed {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.ballot__closed p {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-text-muted);
}
.ballot__result {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.ballot__result--accepted {
  border-color: color-mix(in srgb, var(--mood-approve) 50%, transparent);
  background: color-mix(in srgb, var(--mood-approve) 12%, transparent);
}
.ballot__result--rejected {
  border-color: color-mix(in srgb, var(--mood-reject) 50%, transparent);
  background: color-mix(in srgb, var(--mood-reject) 12%, transparent);
}
.ballot__result-icon {
  font-size: 2rem;
}
.ballot__result--accepted .ballot__result-icon {
  color: var(--mood-approve);
}
.ballot__result--rejected .ballot__result-icon {
  color: var(--mood-reject);
}
.ballot__result-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.ballot__result-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.ballot__chart-card {
  max-width: 420px;
}
.chart-placeholder {
  height: 260px;
}
</style>
