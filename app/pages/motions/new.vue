<script setup lang="ts">
import type { MotionFormValues } from '~/components/MotionForm.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Antrag stellen — FreiWerk' })

const pending = ref(false)
const error = ref('')

async function saveDraft(values: MotionFormValues) {
  return $fetch('/api/motions', { method: 'POST', body: values })
}

async function onSubmit(values: MotionFormValues) {
  error.value = ''
  pending.value = true
  try {
    const res = await saveDraft(values)
    await navigateTo(`/motions/${res.motion!.id}/edit`)
  } catch (err: unknown) {
    error.value = extractError(err, 'Antrag konnte nicht gespeichert werden.')
  } finally {
    pending.value = false
  }
}

async function onPublish(values: MotionFormValues) {
  if (!confirm('Antrag jetzt veröffentlichen? Danach ist keine Bearbeitung mehr möglich.')) {
    return
  }
  error.value = ''
  pending.value = true
  try {
    const res = await saveDraft(values)
    await $fetch(`/api/motions/${res.motion!.id}/publish`, { method: 'POST', body: {} })
    await navigateTo(`/motions/${res.motion!.id}`)
  } catch (err: unknown) {
    error.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="page">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>
    <h1>Neuen Antrag stellen</h1>
    <p class="lead">
      Speichere deinen Antrag als Entwurf oder veröffentliche ihn direkt.
    </p>

    <FwCard>
      <MotionForm
        submit-label="Als Entwurf speichern"
        show-publish
        :pending="pending"
        @submit="onSubmit"
        @publish="onPublish"
      />
      <p v-if="error" class="form-error">{{ error }}</p>
    </FwCard>
  </div>
</template>

<style scoped>
.page {
  max-width: 820px;
  margin: 0 auto;
}
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}
.lead {
  color: var(--color-text-muted);
  margin-bottom: var(--space-5);
}
</style>
