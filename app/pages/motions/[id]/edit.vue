<script setup lang="ts">
import type { MotionFormValues } from '~/components/MotionForm.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = route.params.id as string
const { user } = useAuthUser()

const { data, error: loadError } = await useFetch(`/api/motions/${id}`)

if (loadError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

// Guard: only the author may edit a draft.
watchEffect(() => {
  const m = motion.value
  if (!m) return
  if (m.status !== 'draft' || m.authorId !== user.value?.id) {
    navigateTo(`/motions/${id}`)
  }
})

useHead({ title: () => `Bearbeiten: ${motion.value?.title ?? ''} — FreiWerk` })

const pending = ref(false)
const error = ref('')
const debateDays = ref(14)

async function onSave(values: MotionFormValues) {
  error.value = ''
  pending.value = true
  try {
    await $fetch(`/api/motions/${id}`, { method: 'PATCH', body: values })
    await refreshNuxtData()
    error.value = ''
  } catch (err: unknown) {
    error.value = extractError(err, 'Speichern fehlgeschlagen.')
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
    await $fetch(`/api/motions/${id}`, { method: 'PATCH', body: values })
    await $fetch(`/api/motions/${id}/publish`, {
      method: 'POST',
      body: { debateDays: debateDays.value },
    })
    await navigateTo(`/motions/${id}`)
  } catch (err: unknown) {
    error.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}

async function onDelete() {
  if (!confirm('Diesen Entwurf endgültig löschen?')) return
  pending.value = true
  try {
    await $fetch(`/api/motions/${id}`, { method: 'DELETE' })
    await navigateTo('/motions')
  } catch (err: unknown) {
    error.value = extractError(err, 'Löschen fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div v-if="motion" class="page">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>
    <h1>Entwurf bearbeiten</h1>

    <FwCard>
      <MotionForm
        :initial="{
          title: motion.title,
          summary: motion.summary,
          topic: motion.topic,
          divisionId: motion.divisionId,
          bodyHtml: motion.bodyHtml,
          isAnonymous: motion.isAnonymous,
        }"
        submit-label="Entwurf speichern"
        show-publish
        :pending="pending"
        @submit="onSave"
        @publish="onPublish"
      >
        <template #actions>
          <FwButton variant="ghost" type="button" :disabled="pending" @click="onDelete">
            <FontAwesomeIcon icon="trash" /> Löschen
          </FwButton>
        </template>
      </MotionForm>
      <p v-if="error" class="form-error">{{ error }}</p>
    </FwCard>

    <FwCard class="publish-card">
      <h2>Veröffentlichen</h2>
      <p class="form-hint">
        Mit der Veröffentlichung startet die Debattenphase. Der Antrag ist
        danach schreibgeschützt. Nutze den Veröffentlichen-Button im Formular oben.
      </p>
      <label class="field publish-card__field">
        <span>Dauer der Debatte (Tage)</span>
        <input v-model.number="debateDays" type="number" min="1" max="90" >
      </label>
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
.publish-card {
  margin-top: var(--space-5);
}
.publish-card__field {
  max-width: 220px;
  margin: var(--space-4) 0;
}
</style>
