<script setup lang="ts">
import type { MotionFormValues } from '~/components/MotionForm.vue'
import type { MotionBarAction } from '~/components/MotionActionBar.vue'
import { DEFAULT_DEBATE_DAYS } from '#shared/constants'

definePageMeta({ middleware: 'auth' })

const AUTO_SAVE_INTERVAL_MS = 4000

const route = useRoute()
const id = route.params.id as string
const { user } = useAuthUser()

const { data, error: loadError } = await useFetch(`/api/motions/${id}`)

if (loadError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

watchEffect(() => {
  const m = motion.value
  if (!m) return
  if (m.status !== 'draft' || m.authorId !== user.value?.id) {
    navigateTo(`/motions/${id}`)
  }
})

useHead({ title: () => `Bearbeiten: ${motion.value?.title ?? ''} — FreiWerk` })

const formRef = ref<{
  validateForm: (silent?: boolean) => MotionFormValues | null
  isDirty: () => boolean
  markSaved: () => void
} | null>(null)

const publishModalOpen = ref(false)
const debateDays = ref(DEFAULT_DEBATE_DAYS)
const publishIsAnonymous = ref(false)
const publishPending = ref(false)
const deletePending = ref(false)
const savePending = ref(false)
const formError = ref('')
const publishError = ref('')
const saveError = ref('')

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'pending' | 'error'
const saveStatus = ref<SaveStatus>('saved')

const busy = computed(
  () => publishPending.value || deletePending.value || savePending.value,
)

const saveStatusLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving':
      return 'Speichern …'
    case 'dirty':
      return 'Ungespeicherte Änderungen'
    case 'pending':
      return 'Noch nicht speicherbar'
    case 'error':
      return saveError.value || 'Speichern fehlgeschlagen'
    default:
      return 'Gespeichert'
  }
})

const barActions = computed<MotionBarAction[]>(() => [
  {
    id: 'publish',
    label: publishPending.value ? 'Veröffentlichen …' : 'Veröffentlichen',
    icon: 'paper-plane',
    variant: 'primary',
    disabled: busy.value,
    pinned: true,
  },
  {
    id: 'deleteDraft',
    label: deletePending.value ? 'Löschen …' : 'Löschen',
    icon: 'trash',
    variant: 'ghost',
    disabled: busy.value,
    pinned: true,
  },
])

function onFormChange() {
  if (savePending.value || publishPending.value) return
  if (formRef.value?.isDirty()) {
    saveStatus.value = 'dirty'
  }
}

async function autoSaveDraft() {
  const form = formRef.value
  if (!form || busy.value) return
  if (!form.isDirty()) {
    if (saveStatus.value === 'dirty') saveStatus.value = 'saved'
    return
  }

  const values = form.validateForm(true)
  if (!values) {
    saveStatus.value = 'pending'
    return
  }

  savePending.value = true
  saveStatus.value = 'saving'
  saveError.value = ''
  try {
    await $fetch(`/api/motions/${id}`, { method: 'PATCH', body: values })
    form.markSaved()
    saveStatus.value = 'saved'
  } catch (err: unknown) {
    saveStatus.value = 'error'
    saveError.value = extractError(err, 'Speichern fehlgeschlagen.')
  } finally {
    savePending.value = false
  }
}

function openPublishModal() {
  const form = formRef.value
  if (!form) return

  formError.value = ''
  publishError.value = ''
  const values = form.validateForm()
  if (!values) return

  publishIsAnonymous.value = values.isAnonymous
  debateDays.value = DEFAULT_DEBATE_DAYS
  publishModalOpen.value = true
}

async function confirmPublish() {
  const form = formRef.value
  if (!form) return

  formError.value = ''
  publishError.value = ''
  const values = form.validateForm()
  if (!values) {
    publishModalOpen.value = false
    return
  }

  values.isAnonymous = publishIsAnonymous.value

  publishPending.value = true
  try {
    await $fetch(`/api/motions/${id}`, { method: 'PATCH', body: values })
    form.markSaved()
    saveStatus.value = 'saved'
    await $fetch(`/api/motions/${id}/publish`, {
      method: 'POST',
      body: { debateDays: debateDays.value },
    })
    publishModalOpen.value = false
    await navigateTo(`/motions/${id}`)
  } catch (err: unknown) {
    publishError.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    publishPending.value = false
  }
}

async function onDelete() {
  if (!confirm('Diesen Entwurf endgültig löschen?')) return
  deletePending.value = true
  try {
    await $fetch(`/api/motions/${id}`, { method: 'DELETE' })
    await navigateTo('/motions')
  } catch (err: unknown) {
    formError.value = extractError(err, 'Löschen fehlgeschlagen.')
  } finally {
    deletePending.value = false
  }
}

function onBarAction(actionId: string) {
  if (actionId === 'publish') openPublishModal()
  else if (actionId === 'deleteDraft') onDelete()
}

let autoSaveTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  autoSaveTimer = setInterval(() => {
    void autoSaveDraft()
  }, AUTO_SAVE_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
})
</script>

<template>
  <div v-if="motion" class="page">
    <NuxtLink to="/motions" class="back-link">← Zur Antragsübersicht</NuxtLink>
    <h1>Entwurf bearbeiten</h1>

    <FwCard class="edit-card">
      <MotionForm
        ref="formRef"
        hide-submit
        hide-actions
        hide-anonymous
        :initial="{
          title: motion.title,
          summary: motion.summary,
          topic: motion.topic,
          divisionId: motion.divisionId,
          bodyHtml: motion.bodyHtml,
          isAnonymous: motion.isAnonymous,
        }"
        @change="onFormChange"
      >
        <template #editor-status>
          <span
            class="editor-status"
            :class="{ 'editor-status--error': saveStatus === 'error' }"
            aria-live="polite"
          >
            {{ saveStatusLabel }}
          </span>
        </template>
      </MotionForm>
      <p v-if="formError" class="form-error">{{ formError }}</p>
    </FwCard>

    <MotionPublishModal
      v-model:open="publishModalOpen"
      v-model:debate-days="debateDays"
      v-model:is-anonymous="publishIsAnonymous"
      :pending="publishPending"
      :error="publishError"
      @confirm="confirmPublish"
    />

    <MotionActionBar :actions="barActions" @action="onBarAction" />
  </div>
</template>

<style scoped>
.page {
  max-width: 820px;
  margin: 0 auto;
  padding-bottom: calc(3.5rem + var(--space-4));
}
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}
</style>
