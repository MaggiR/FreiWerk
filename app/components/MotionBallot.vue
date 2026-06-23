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
const ballotStartedAt = computed(() => data.value?.ballotStartedAt ?? null)
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

const phaseLabel = computed(() => {
  if (status.value === 'decided') return 'Beschlossen'
  if (deadlinePassed.value) return 'Auswertung ausstehend'
  if (hasVoted.value) return 'Stimme abgegeben'
  return 'Abstimmung läuft'
})

const ICONS: Record<BallotChoiceValue, string> = {
  approve: 'thumbs-up',
  reject: 'thumbs-down',
  abstain: 'circle-half-stroke',
}

const CHOICE_HINTS: Record<BallotChoiceValue, string> = {
  approve: 'Der Antrag wird angenommen',
  reject: 'Der Antrag wird abgelehnt',
  abstain: 'Du nimmst keine Position ein',
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
      <div
        class="ballot__stage ballot__stage--decided"
        :class="outcome ? `ballot__stage--${outcome}` : undefined"
      >
        <div class="ballot__glow" aria-hidden="true" />
        <div class="ballot__stage-inner">
          <span class="ballot__phase">{{ phaseLabel }}</span>
          <div class="ballot__seal ballot__seal--decided">
            <FontAwesomeIcon
              :icon="outcome === 'accepted' ? 'circle-check' : 'circle-xmark'"
            />
          </div>
          <p class="ballot__kicker">Ergebnis der Schlussabstimmung</p>
          <h3 class="ballot__verdict">{{ outcomeLabel(outcome) }}</h3>
          <p class="ballot__verdict-sub">
            Geheime Abstimmung mit {{ totalVotes }}
            {{ totalVotes === 1 ? 'Stimme' : 'Stimmen' }}
            <template v-if="ballotStartedAt && ballotEndsAt">
              · {{ formatDate(ballotStartedAt) }} bis {{ formatDate(ballotEndsAt) }}
            </template>
          </p>
        </div>
      </div>

      <section class="ballot__tally" aria-labelledby="ballot-tally-heading">
        <h4 id="ballot-tally-heading" class="ballot__tally-title">
          <FontAwesomeIcon icon="chart-pie" />
          Stimmverhalten
        </h4>
        <FwCard class="ballot__chart-card">
          <ClientOnly>
            <MoodRingChart :totals="totals" :total-votes="totalVotes" />
            <template #fallback><div class="chart-placeholder" /></template>
          </ClientOnly>
        </FwCard>
      </section>
    </template>

    <!-- Active or awaiting evaluation. -->
    <template v-else>
      <div class="ballot__stage ballot__stage--active">
        <div class="ballot__glow" aria-hidden="true" />
        <div class="ballot__stage-inner">
          <span class="ballot__phase">{{ phaseLabel }}</span>
          <div class="ballot__seal">
            <FontAwesomeIcon icon="check-to-slot" />
          </div>
          <p class="ballot__kicker">Geheime Schlussabstimmung</p>
          <p class="ballot__lead">
            Der feierliche Abschluss der Beratung — jede Stimme zählt gleich,
            keine ist mit deinem Profil verknüpft.
          </p>

          <div class="ballot__metrics">
            <div class="ballot__metric">
              <span class="ballot__metric-value">{{ participantCount }}</span>
              <span class="ballot__metric-label">
                {{ participantCount === 1 ? 'Stimme abgegeben' : 'Stimmen abgegeben' }}
              </span>
            </div>
            <div
              v-if="ballotEndsAt && !deadlinePassed"
              class="ballot__metric ballot__metric--deadline"
            >
              <FontAwesomeIcon icon="clock" class="ballot__metric-icon" />
              <span class="ballot__metric-value">{{ timeRemaining(ballotEndsAt) }}</span>
              <span class="ballot__metric-label">verbleibend</span>
            </div>
          </div>

          <p v-if="ballotStartedAt && ballotEndsAt" class="ballot__period">
            Abstimmungszeitraum:
            {{ formatDate(ballotStartedAt) }} bis {{ formatDate(ballotEndsAt) }}
          </p>

          <p class="ballot__secrecy">
            <FontAwesomeIcon icon="lock" />
            Geheimwahl — Stimme und Profil werden getrennt gespeichert.
          </p>
        </div>
      </div>

      <div v-if="votingOpen && loggedIn && !hasVoted" class="ballot__vote">
        <p class="ballot__vote-prompt">Wie stimmst du ab?</p>
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
            <span class="ballot__btn-icon">
              <FontAwesomeIcon :icon="ICONS[choice]" />
            </span>
            <span class="ballot__btn-label">{{ BALLOT_LABELS[choice] }}</span>
            <span class="ballot__btn-hint">{{ CHOICE_HINTS[choice] }}</span>
          </button>
        </div>
        <p class="ballot__hint">
          Die Stimmabgabe ist endgültig und kann nicht geändert werden.
        </p>
      </div>

      <div v-else-if="votingOpen && hasVoted" class="ballot__status ballot__status--voted">
        <div class="ballot__status-icon">
          <FontAwesomeIcon icon="circle-check" />
        </div>
        <div>
          <p class="ballot__status-title">Deine Stimme ist erfasst</p>
          <p class="ballot__status-text">
            Das Ergebnis wird nach Ende der Frist veröffentlicht — bis dahin bleibt
            die Auszählung geheim.
          </p>
        </div>
      </div>

      <div v-else-if="votingOpen && !loggedIn" class="ballot__status ballot__status--login">
        <div class="ballot__status-icon">
          <FontAwesomeIcon icon="user" />
        </div>
        <div>
          <p class="ballot__status-title">Mitgliedschaft erforderlich</p>
          <p class="ballot__status-text">
            <button type="button" class="inline-link" @click="openAuthModal('login')">
              Melde dich an
            </button>, um an der Schlussabstimmung teilzunehmen.
          </p>
        </div>
      </div>

      <div v-else class="ballot__status ballot__status--closed">
        <div class="ballot__status-icon">
          <FontAwesomeIcon icon="hourglass-end" />
        </div>
        <div>
          <p class="ballot__status-title">Abstimmungsfrist beendet</p>
          <p class="ballot__status-text">
            Das Ergebnis wird nach der Auswertung veröffentlicht.
          </p>
          <FwButton
            v-if="canManage"
            variant="primary"
            class="ballot__finalize"
            :disabled="finalizing"
            @click="onFinalize"
          >
            {{ finalizing ? 'Auswerten …' : 'Abstimmung auswerten' }}
          </FwButton>
        </div>
      </div>

      <p v-if="error" class="form-error ballot__error">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.ballot {
  container-type: inline-size;
  container-name: ballot;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.ballot__stage {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-primary) 28%, var(--color-bg-elevated)) 0%,
      var(--color-bg-elevated) 42%,
      color-mix(in srgb, var(--color-secondary) 6%, var(--color-bg-elevated)) 100%
    );
  box-shadow: var(--shadow-md);
}

.ballot__glow {
  position: absolute;
  inset: -40% -20% auto;
  height: 70%;
  background: radial-gradient(
    ellipse at 50% 0%,
    color-mix(in srgb, var(--color-primary) 55%, transparent) 0%,
    transparent 68%
  );
  pointer-events: none;
}

.ballot__stage-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-5);
}

.ballot__phase {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem var(--space-3);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-primary) 35%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 50%, transparent);
  color: var(--color-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ballot__seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 55%, var(--color-surface));
  border: 2px solid color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary));
  color: var(--color-secondary);
  font-size: 1.85rem;
  box-shadow:
    0 0 0 6px color-mix(in srgb, var(--color-primary) 18%, transparent),
    var(--shadow-sm);
}

.ballot__kicker {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-secondary) 65%, var(--color-text-muted));
}

.ballot__lead {
  margin: 0;
  max-width: 36rem;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--color-text);
}

.ballot__metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-4);
  width: 100%;
  margin-top: var(--space-2);
}

.ballot__metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 7rem;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-surface) 75%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
}

.ballot__metric--deadline {
  border-color: color-mix(in srgb, var(--color-secondary) 25%, var(--color-border));
}

.ballot__metric-icon {
  font-size: 0.9rem;
  color: var(--color-secondary);
  margin-bottom: 0.1rem;
}

.ballot__metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-secondary);
  line-height: 1.2;
}

.ballot__metric-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.ballot__period {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.ballot__secrecy {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-secondary) 8%, transparent);
  font-size: 0.82rem;
  color: color-mix(in srgb, var(--color-secondary) 80%, var(--color-text-muted));
}

.ballot__vote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.ballot__vote-prompt {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
}

.ballot__choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  width: 100%;
  max-width: 42rem;
}

.ballot__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-3);
  font-family: inherit;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.ballot__btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.ballot__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ballot__btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.35rem;
  background: var(--color-bg);
  transition: background 0.2s ease, color 0.2s ease;
}

.ballot__btn-label {
  font-size: 1rem;
  font-weight: 700;
}

.ballot__btn-hint {
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--color-text-muted);
  text-align: center;
}

.ballot__btn--approve:hover:not(:disabled) {
  border-color: var(--mood-approve);
}
.ballot__btn--approve:hover:not(:disabled) .ballot__btn-icon {
  background: color-mix(in srgb, var(--mood-approve) 14%, var(--color-bg));
  color: var(--mood-approve);
}

.ballot__btn--reject:hover:not(:disabled) {
  border-color: var(--mood-reject);
}
.ballot__btn--reject:hover:not(:disabled) .ballot__btn-icon {
  background: color-mix(in srgb, var(--mood-reject) 14%, var(--color-bg));
  color: var(--mood-reject);
}

.ballot__btn--abstain:hover:not(:disabled) {
  border-color: var(--mood-abstain);
}
.ballot__btn--abstain:hover:not(:disabled) .ballot__btn-icon {
  background: color-mix(in srgb, var(--mood-abstain) 20%, var(--color-bg));
  color: var(--color-text-muted);
}

.ballot__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
}

.ballot__status {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.ballot__status--voted {
  border-color: color-mix(in srgb, var(--mood-approve) 45%, var(--color-border));
  background: color-mix(in srgb, var(--mood-approve) 8%, var(--color-surface));
}

.ballot__status-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  font-size: 1.1rem;
  background: var(--color-bg);
  color: var(--color-text-muted);
}

.ballot__status--voted .ballot__status-icon {
  color: var(--mood-approve);
}

.ballot__status-title {
  margin: 0 0 var(--space-1);
  font-size: 1rem;
  font-weight: 700;
}

.ballot__status-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.ballot__finalize {
  margin-top: var(--space-3);
}

.ballot__error {
  margin: 0;
}

.ballot__stage--decided {
  border-width: 2px;
}

.ballot__stage--accepted {
  border-color: color-mix(in srgb, var(--mood-approve) 55%, var(--color-primary));
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--mood-approve) 16%, var(--color-bg-elevated)) 0%,
      var(--color-bg-elevated) 50%,
      color-mix(in srgb, var(--color-primary) 12%, var(--color-bg-elevated)) 100%
    );
}

.ballot__stage--rejected {
  border-color: color-mix(in srgb, var(--mood-reject) 55%, var(--color-primary));
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--mood-reject) 14%, var(--color-bg-elevated)) 0%,
      var(--color-bg-elevated) 50%,
      color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-elevated)) 100%
    );
}

.ballot__seal--decided {
  width: 5rem;
  height: 5rem;
  font-size: 2.1rem;
}

.ballot__stage--accepted .ballot__seal--decided {
  background: color-mix(in srgb, var(--mood-approve) 22%, var(--color-primary));
  border-color: var(--mood-approve);
  color: var(--mood-approve);
}

.ballot__stage--rejected .ballot__seal--decided {
  background: color-mix(in srgb, var(--mood-reject) 18%, var(--color-primary));
  border-color: var(--mood-reject);
  color: var(--mood-reject);
}

.ballot__verdict {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  font-weight: 700;
  line-height: 1.15;
  color: var(--color-secondary);
}

.ballot__stage--accepted .ballot__verdict {
  color: var(--mood-approve);
}

.ballot__stage--rejected .ballot__verdict {
  color: var(--mood-reject);
}

.ballot__verdict-sub {
  margin: 0;
  max-width: 32rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.ballot__tally-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.ballot__chart-card {
  max-width: 28rem;
  margin-inline: auto;
}

.chart-placeholder {
  height: 260px;
}

@container ballot (max-width: 559px) {
  .ballot__choices {
    grid-template-columns: 1fr;
    max-width: 20rem;
  }

  .ballot__stage-inner {
    padding: var(--space-5) var(--space-4);
  }

  .ballot__btn {
    padding: var(--space-4);
  }
}

.dark .ballot__phase {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.dark .ballot__kicker {
  color: var(--color-text-muted);
}

.dark .ballot__metric-icon,
.dark .ballot__metric-value {
  color: var(--color-primary);
}

.dark .ballot__metric--deadline {
  border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
}

.dark .ballot__secrecy {
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.dark .ballot__verdict {
  color: var(--color-text);
}

.dark .ballot__stage--accepted .ballot__verdict {
  color: var(--mood-approve);
}

.dark .ballot__stage--rejected .ballot__verdict {
  color: var(--mood-reject);
}
</style>
