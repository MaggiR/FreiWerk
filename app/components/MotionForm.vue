<script setup lang="ts">
import {
  TOPICS,
  TOPIC_LABELS,
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
  type Topic,
} from '#shared/constants'

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
    submitLabel?: string
    publishLabel?: string
    showPublish?: boolean
    hideSubmit?: boolean
    /** Hides publish and the actions slot (e.g. when using MotionActionBar). */
    hideActions?: boolean
    /** Hides anonymous submit option (e.g. shown in publish modal instead). */
    hideAnonymous?: boolean
    pending?: boolean
  }>(),
  {
    submitLabel: 'Speichern',
    publishLabel: 'Veröffentlichen',
    showPublish: false,
    hideSubmit: false,
    hideActions: false,
    hideAnonymous: false,
    pending: false,
  },
)

const emit = defineEmits<{
  submit: [values: MotionFormValues]
  publish: [values: MotionFormValues]
  change: []
}>()

const { data: divisionData } = useFetch('/api/divisions')

const form = reactive<MotionFormValues>({
  title: props.initial?.title ?? '',
  summary: props.initial?.summary ?? '',
  topic: props.initial?.topic ?? '',
  divisionId: props.initial?.divisionId ?? null,
  bodyHtml: props.initial?.bodyHtml ?? '',
  isAnonymous: props.initial?.isAnonymous ?? false,
})

const TITLE_MIN = MOTION_TITLE_MIN
const TITLE_MAX = MOTION_TITLE_MAX
const SUMMARY_MIN = MOTION_SUMMARY_MIN
const SUMMARY_MAX = MOTION_SUMMARY_MAX

const error = ref('')
const titleLength = computed(() => form.title.length)
const summaryLength = computed(() => form.summary.length)

function formSnapshot(): MotionFormValues {
  return { ...form }
}

const savedSnapshot = ref(JSON.stringify(formSnapshot()))

watch(
  form,
  () => {
    emit('change')
  },
  { deep: true },
)

function isDirty(): boolean {
  return JSON.stringify(formSnapshot()) !== savedSnapshot.value
}

function markSaved(): void {
  savedSnapshot.value = JSON.stringify(formSnapshot())
}

function validateForm(silent = false): MotionFormValues | null {
  if (!silent) error.value = ''
  if (form.title.trim().length < MOTION_TITLE_MIN) {
    if (!silent) {
      error.value = `Der Titel muss mindestens ${MOTION_TITLE_MIN} Zeichen haben.`
    }
    return null
  }
  if (form.title.trim().length > MOTION_TITLE_MAX) {
    if (!silent) error.value = 'Der Titel darf höchstens 150 Zeichen haben.'
    return null
  }
  if (form.summary.trim().length < MOTION_SUMMARY_MIN) {
    if (!silent) error.value = 'Die Kurzbeschreibung muss mindestens 50 Zeichen haben.'
    return null
  }
  if (form.summary.trim().length > MOTION_SUMMARY_MAX) {
    if (!silent) error.value = 'Die Kurzbeschreibung darf höchstens 200 Zeichen haben.'
    return null
  }
  if (!isTopic(form.topic)) {
    if (!silent) error.value = 'Bitte wähle ein Themengebiet.'
    return null
  }
  const text = form.bodyHtml.replace(/<[^>]*>/g, '').trim()
  if (text.length === 0) {
    if (!silent) error.value = 'Der Antragstext darf nicht leer sein.'
    return null
  }
  return formSnapshot()
}

function onSubmit() {
  const values = validateForm()
  if (values) emit('submit', values)
}

function onPublish() {
  const values = validateForm()
  if (values) emit('publish', values)
}

defineExpose({
  getValues: formSnapshot,
  validateForm,
  isDirty,
  markSaved,
})
</script>

<template>
  <form class="motion-form" @submit.prevent="onSubmit">
    <label class="field">
      <span>Titel</span>
      <input v-model="form.title" type="text" required :maxlength="MOTION_TITLE_MAX" >
      <div class="motion-form__field-meta">
        <span class="form-hint">
          Ein prägnanter Antragstitel ({{ TITLE_MIN }}–{{ TITLE_MAX }} Zeichen).
        </span>
        <span
          class="motion-form__counter"
          :class="{
            'motion-form__counter--low': titleLength > 0 && titleLength < TITLE_MIN,
            'motion-form__counter--max': titleLength >= TITLE_MAX,
          }"
          aria-live="polite"
        >
          {{ titleLength }} / {{ TITLE_MAX }}
        </span>
      </div>
    </label>

    <label class="field">
      <span>Kurzbeschreibung</span>
      <textarea
        v-model="form.summary"
        class="motion-form__summary"
        rows="4"
        required
        minlength="50"
        :maxlength="MOTION_SUMMARY_MAX"
      />
      <div class="motion-form__field-meta">
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
        <span>Geltungsbereich</span>
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

    <div class="field motion-form__editor-field">
      <span>Antragstext</span>
      <ClientOnly>
        <MotionEditor v-model="form.bodyHtml" />
        <template #fallback>
          <div class="editor-loading">Editor wird geladen ...</div>
        </template>
      </ClientOnly>
      <slot name="editor-status" />
    </div>

    <label v-if="!hideAnonymous" class="motion-form__check">
      <input v-model="form.isAnonymous" type="checkbox">
      <span>Anonym einreichen</span>
    </label>
    <p v-if="!hideAnonymous" class="form-hint motion-form__anon-hint">
      Dein Name wird öffentlich nicht angezeigt. Die Zuordnung bleibt intern für die Verwaltung des Antrags erhalten.
    </p>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div v-if="!hideActions" class="motion-form__actions">
      <FwButton v-if="!hideSubmit" type="submit" :disabled="pending">
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

.motion-form__field-meta {
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

.motion-form__editor-field :deep(.editor-status) {
  display: block;
  margin-top: var(--space-2);
  text-align: right;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.motion-form__editor-field :deep(.editor-status--error) {
  color: var(--color-danger);
}
@media (max-width: 640px) {
  .motion-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
