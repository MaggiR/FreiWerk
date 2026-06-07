<script setup lang="ts">
import type { MotionFormValues } from '~/components/MotionForm.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Antrag stellen — FreiWerk' })

const pending = ref(false)
const error = ref('')

async function onSubmit(values: MotionFormValues) {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch('/api/motions', { method: 'POST', body: values })
    await navigateTo(`/motions/${res.motion!.id}/edit`)
  } catch (err: unknown) {
    error.value = extractError(err, 'Antrag konnte nicht gespeichert werden.')
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
      Dein Antrag wird zunächst als Entwurf gespeichert. Du kannst ihn danach
      prüfen und veröffentlichen.
    </p>

    <FwCard>
      <MotionForm submit-label="Als Entwurf speichern" :pending="pending" @submit="onSubmit" />
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
