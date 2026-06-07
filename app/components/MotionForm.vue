<script setup lang="ts">
import { TOPICS, TOPIC_LABELS } from '../../shared/constants'

export interface MotionFormValues {
  title: string
  summary: string
  topic: string
  divisionId: string | null
  bodyHtml: string
}

const props = defineProps<{
  initial?: Partial<MotionFormValues>
  submitLabel: string
  pending?: boolean
}>()

const emit = defineEmits<{ submit: [values: MotionFormValues] }>()

const { data: divisionData } = await useFetch('/api/divisions')

const form = reactive<MotionFormValues>({
  title: props.initial?.title ?? '',
  summary: props.initial?.summary ?? '',
  topic: props.initial?.topic ?? TOPICS[0],
  divisionId: props.initial?.divisionId ?? null,
  bodyHtml: props.initial?.bodyHtml ?? '',
})

const error = ref('')

function onSubmit() {
  error.value = ''
  if (form.title.trim().length < 5) {
    error.value = 'Der Titel muss mindestens 5 Zeichen haben.'
    return
  }
  if (form.summary.trim().length < 10) {
    error.value = 'Die Kurzbeschreibung muss mindestens 10 Zeichen haben.'
    return
  }
  const text = form.bodyHtml.replace(/<[^>]*>/g, '').trim()
  if (text.length === 0) {
    error.value = 'Der Antragstext darf nicht leer sein.'
    return
  }
  emit('submit', { ...form })
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
      <textarea v-model="form.summary" rows="2" required maxlength="500" />
      <span class="form-hint">Eine prägnante Zusammenfassung des Anliegens.</span>
    </label>

    <div class="motion-form__row">
      <label class="field">
        <span>Themengebiet</span>
        <select v-model="form.topic">
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

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="motion-form__actions">
      <FwButton type="submit" :disabled="pending">
        {{ pending ? 'Speichern ...' : submitLabel }}
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
.editor-loading {
  padding: var(--space-5);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}
@media (max-width: 640px) {
  .motion-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
