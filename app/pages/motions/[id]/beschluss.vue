<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data, error } = await useFetch(`/api/motions/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

const { data: ballotData } = await useFetch(`/api/motions/${id}/ballot`)

const isDecided = computed(() => motion.value?.status === 'decided')
const isArchived = computed(() => Boolean(motion.value?.archivedAt))

// The decision document only exists once a motion is decided or archived.
watchEffect(() => {
  const m = motion.value
  if (m && m.status !== 'decided' && !m.archivedAt) {
    navigateTo(`/motions/${id}`)
  }
})

const totals = computed(() => ballotData.value?.totals ?? null)
const totalVotes = computed(() => ballotData.value?.totalVotes ?? 0)

const exportHref = computed(() => `/api/motions/${id}/export?format=markdown`)

function onPrint() {
  if (import.meta.client) window.print()
}

useHead({
  title: () => `Beschluss: ${motion.value?.title ?? 'Antrag'} — FreiWerk`,
  bodyAttrs: { class: 'beschluss-print' },
})
</script>

<template>
  <article v-if="motion" class="beschluss">
    <div class="beschluss__no-print beschluss__toolbar">
      <NuxtLink :to="`/motions/${id}`" class="back-link">← Zurück zum Antrag</NuxtLink>
      <div class="beschluss__actions">
        <FwButton variant="secondary" type="button" @click="onPrint">
          <FontAwesomeIcon icon="print" /> Als PDF exportieren
        </FwButton>
        <a :href="exportHref" class="beschluss__download" download>
          <FontAwesomeIcon icon="download" /> Als Markdown
        </a>
      </div>
    </div>

    <FwCard class="beschluss__doc" pad>
      <header class="beschluss__header">
        <p class="beschluss__kicker">
          <FontAwesomeIcon icon="file-lines" /> Beschlussdokument
        </p>
        <h1 class="beschluss__title">{{ motion.title }}</h1>
        <p class="beschluss__summary">{{ motion.summary }}</p>

        <dl class="beschluss__meta">
          <div>
            <dt>Status</dt>
            <dd>{{ statusLabel(motion.status) }}</dd>
          </div>
          <div>
            <dt>Thema</dt>
            <dd>{{ topicLabel(motion.topic) }}</dd>
          </div>
          <div v-if="motion.division?.name">
            <dt>Gliederung</dt>
            <dd>{{ motion.division.name }}</dd>
          </div>
          <div>
            <dt>Eingereicht von</dt>
            <dd>{{ motion.isAnonymous ? 'Anonym' : (motion.author?.displayName ?? 'Unbekannt') }}</dd>
          </div>
          <div v-if="motion.publishedAt">
            <dt>Veröffentlicht</dt>
            <dd>{{ formatDate(motion.publishedAt) }}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{{ motion.currentVersion }}</dd>
          </div>
        </dl>
      </header>

      <section
        v-if="isDecided && motion.outcome"
        class="beschluss__result"
        :class="`beschluss__result--${motion.outcome}`"
      >
        <h2>
          <FontAwesomeIcon
            :icon="motion.outcome === 'accepted' ? 'circle-check' : 'circle-xmark'"
          />
          {{ outcomeLabel(motion.outcome) }}
        </h2>
        <p v-if="motion.ballotStartedAt && motion.ballotEndsAt" class="beschluss__result-period">
          Geheime Schlussabstimmung vom {{ formatDate(motion.ballotStartedAt) }}
          bis {{ formatDate(motion.ballotEndsAt) }}.
        </p>
        <table v-if="totals" class="beschluss__tally">
          <tbody>
            <tr>
              <th scope="row">Zustimmung</th>
              <td>{{ totals.approve }}</td>
            </tr>
            <tr>
              <th scope="row">Ablehnung</th>
              <td>{{ totals.reject }}</td>
            </tr>
            <tr>
              <th scope="row">Enthaltung</th>
              <td>{{ totals.abstain }}</td>
            </tr>
            <tr class="beschluss__tally-total">
              <th scope="row">Gesamt</th>
              <td>{{ totalVotes }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="isArchived" class="beschluss__note">
        <p>
          <FontAwesomeIcon icon="box-archive" />
          Dieser Antrag wurde archiviert, ohne dass eine formale Abstimmung
          abgeschlossen wurde.
        </p>
      </section>

      <section class="beschluss__body">
        <h2>Antragstext</h2>
        <RichText :html="motion.bodyHtml" />
      </section>

      <footer class="beschluss__footer">
        Exportiert am {{ formatDate(new Date()) }} über FreiWerk.
      </footer>
    </FwCard>
  </article>
</template>

<style scoped>
.beschluss {
  max-width: 820px;
  margin: 0 auto;
}
.beschluss__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.back-link {
  color: var(--color-text-muted);
}
.beschluss__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.beschluss__download {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: background 0.2s ease, transform 0.12s ease;
}
.beschluss__download:hover {
  background: var(--color-bg);
  transform: translateY(-1px);
}
.beschluss__header {
  padding-bottom: var(--space-5);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.beschluss__kicker {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.8rem;
}
.beschluss__title {
  margin: 0 0 var(--space-3);
  font-size: 2rem;
  line-height: 1.25;
}
.beschluss__summary {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: 1.1rem;
}
.beschluss__meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: var(--space-3);
  margin: 0;
}
.beschluss__meta dt {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.beschluss__meta dd {
  margin: 0;
  font-weight: 600;
}
.beschluss__result {
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.beschluss__result--accepted {
  background: color-mix(in srgb, var(--color-success, #0a9f5e) 10%, transparent);
}
.beschluss__result--rejected {
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
}
.beschluss__result h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
}
.beschluss__result-period {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
}
.beschluss__tally {
  width: 100%;
  max-width: 22rem;
  border-collapse: collapse;
}
.beschluss__tally th,
.beschluss__tally td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.beschluss__tally td {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.beschluss__tally-total {
  font-weight: 700;
}
.beschluss__note {
  margin-bottom: var(--space-5);
  color: var(--color-text-muted);
}
.beschluss__body h2 {
  margin: 0 0 var(--space-3);
}
.beschluss__footer {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
</style>
