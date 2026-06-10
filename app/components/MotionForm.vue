<script setup lang="ts">
import { TOPICS, TOPIC_LABELS, type Topic } from '#shared/constants'

function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value)
}

export interface MotionFormValues {
  title: string
  summary: string
  topic: string
  divisionId: string | null
  bodyHtml: string
  isAnonymous: boolean
}

const props = withDefaults(
  defineProps<{
    initial?: Partial<MotionFormValues>
    submitLabel: string
    publishLabel?: string
    showPublish?: boolean
    pending?: boolean
  }>(),
  {
    publishLabel: 'Veröffentlichen',
    showPublish: false,
    pending: false,
  },
)

const emit = defineEmits<{
  submit: [values: MotionFormValues]
  publish: [values: MotionFormValues]
}>()

const { data: divisionData } = await useFetch('/api/divisions')

const form = reactive<MotionFormValues>({
  title: props.initial?.title ?? '',
  summary: props.initial?.summary ?? '',
  topic: props.initial?.topic ?? '',
  divisionId: props.initial?.divisionId ?? null,
  bodyHtml: props.initial?.bodyHtml ?? '',
  isAnonymous: props.initial?.isAnonymous ?? false,
})

const SUMMARY_MIN = 50
const SUMMARY_MAX = 200

const error = ref('')
const summaryLength = computed(() => form.summary.length)

function validateForm(): MotionFormValues | null {
  error.value = ''
  if (form.title.trim().length < 5) {
    error.value = 'Der Titel muss mindestens 5 Zeichen haben.'
    return null
  }
  if (form.summary.trim().length < 50) {
    error.value = 'Die Kurzbeschreibung muss mindestens 50 Zeichen haben.'
    return null
  }
  if (form.summary.trim().length > 200) {
    error.value = 'Die Kurzbeschreibung darf höchstens 200 Zeichen haben.'
    return null
  }
  if (!isTopic(form.topic)) {
    error.value = 'Bitte wähle ein Themengebiet.'
    return null
  }
  const text = form.bodyHtml.replace(/<[^>]*>/g, '').trim()
  if (text.length === 0) {
    error.value = 'Der Antragstext darf nicht leer sein.'
    return null
  }
  return { ...form }
}

function onSubmit() {
  const values = validateForm()
  if (values) emit('submit', values)
}

function onPublish() {
  const values = validateForm()
  if (values) emit('publish', values)
}
</script>

<template>
  <form class="motion-form" @submit.prevent="onSubmit">
    <label class="field">
      <span>Titel</span>
      <input v-model="form.title" type="text" required maxlength="200" >
    </label>

    <label class="field">
      <span>Kurzbeschreibung</span>
      <textarea
        v-model="form.summary"
        class="motion-form__summary"
        rows="4"
        required
        minlength="50"
        maxlength="200"
      />
      <div class="motion-form__summary-meta">
        <span class="form-hint">
          Eine prägnante Zusammenfassung des Anliegens ({{ SUMMARY_MIN }}–{{ SUMMARY_MAX }} Zeichen).
        </span>
        <span
          class="motion-form__counter"
          :class="{
            'motion-form__counter--low': summaryLength > 0 && summaryLength < SUMMARY_MIN,
            'motion-form__counter--max': summaryLength >= SUMMARY_MAX,
          }"
          aria-live="polite"
        >
          {{ summaryLength }} / {{ SUMMARY_MAX }}
        </span>
      </div>
    </label>

    <div class="motion-form__row">
      <label class="field">
        <span>Themengebiet</span>
        <select v-model="form.topic" required>
          <option value="" disabled>Bitte wählen …</option>
          <option v-for="t in TOPICS" :key="t" :value="t">
            {{ TOPIC_LABELS[t] }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Zuständige Gliederungsebene</span>
        <select v-model="form.divisionId">
          <option :value="null">Keine Angabe</option>
          <option
            v-for="d in divisionData?.divisions ?? []"
            :key="d.id"
            :value="d.id"
          >
            {{ d.name }}
          </option>
        </select>
      </label>
    </div>

    <div class="field">
      <span>Antragstext</span>
      <ClientOnly>
        <MotionEditor v-model="form.bodyHtml" />
        <template #fallback>
          <div class="editor-loading">Editor wird geladen ...</div>
        </template>
      </ClientOnly>
    </div>

    <label class="motion-form__check">
      <input v-model="form.isAnonymous" type="checkbox">
      <span>Anonym einreichen</span>
    </label>
    <p class="form-hint motion-form__anon-hint">
      Dein Name wird öffentlich nicht angezeigt. Die Zuordnung bleibt intern für die Verwaltung des Antrags erhalten.
    </p>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="motion-form__actions">
      <FwButton type="submit" :disabled="pending">
        <FontAwesomeIcon icon="floppy-disk" />
        {{ pending ? 'Speichern ...' : submitLabel }}
      </FwButton>
      <FwButton
        v-if="showPublish"
        type="button"
        variant="secondary"
        :disabled="pending"
        @click="onPublish"
      >
        <FontAwesomeIcon icon="paper-plane" />
        {{ pending ? 'Veröffentlichen ...' : publishLabel }}
      </FwButton>
      <slot name="actions" />
    </div>
  </form>
</template>

<style scoped>
.motion-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.motion-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.motion-form__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.motion-form__summary {
  resize: none;
}

.motion-form__summary-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.motion-form__counter {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.motion-form__counter--low {
  color: var(--color-danger);
}

.motion-form__counter--max {
  color: var(--color-accent);
}

.editor-loading {
  padding: var(--space-5);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}

.motion-form__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  cursor: pointer;
}

.motion-form__check input {
  width: auto;
  margin: 0;
}

.motion-form__anon-hint {
  margin: calc(-1 * var(--space-3)) 0 0;
}
@media (max-width: 640px) {
  .motion-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
