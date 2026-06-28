<script setup lang="ts">
import type { MotionFormValues } from '~/components/MotionForm.vue'
import type { MotionBarAction } from '~/components/MotionActionBar.vue'
import { DEFAULT_DEBATE_DAYS } from '#shared/constants'

const AUTO_SAVE_INTERVAL_MS = 4000

const props = defineProps<{
  /** When set, loads and edits an existing draft. Otherwise starts a new draft. */
  motionId?: string
}>()

const router = useRouter()
const { user } = useAuthUser()

const draftId = ref<string | null>(props.motionId ?? null)

type MotionDraftLoadResponse = {
  motion: {
    status: string
    authorId: string | null
    title: string
    summary: string
    topic: string
    divisionId: string | null
    bodyHtml: string
    isAnonymous: boolean
  }
}

const fetchResult = props.motionId
  ? await useFetch<MotionDraftLoadResponse>(`/api/motions/${props.motionId}`)
  : null

const data = fetchResult?.data ?? ref<MotionDraftLoadResponse | null>(null)
const loadError = fetchResult?.error ?? ref(null)

if (props.motionId && loadError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

watchEffect(() => {
  if (!props.motionId) return
  const m = motion.value
  const uid = user.value?.id
  if (!m || !uid) return
  if (m.status !== 'draft' || m.authorId !== uid) {
    navigateTo(`/motions/${props.motionId}`)
  }
})

const formRef = ref<{
  getDraftValues: () => MotionFormValues
  validateForPublish: () => MotionFormValues | null
  isDirty: () => boolean
  markSaved: () => void
} | null>(null)

const publishModalOpen = ref(false)
const deleteModalOpen = ref(false)
const deleteHasContent = ref(false)
const debateDays = ref(DEFAULT_DEBATE_DAYS)
const publishPending = ref(false)
const deletePending = ref(false)
const savePending = ref(false)
const formError = ref('')
const publishError = ref('')
const saveError = ref('')

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error'
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
    case 'error':
      return saveError.value || 'Speichern fehlgeschlagen'
    default:
      return 'Gespeichert'
  }
})

const barActions = computed<MotionBarAction[]>(() => {
  const actions: MotionBarAction[] = [
    {
      id: 'publish',
      label: publishPending.value ? 'Veröffentlichen …' : 'Veröffentlichen',
      icon: 'paper-plane',
      variant: 'primary',
      disabled: busy.value,
      pinned: true,
    },
    {
      id: 'close',
      label: savePending.value ? 'Speichern …' : 'Schließen',
      icon: 'xmark',
      variant: 'ghost',
      disabled: busy.value,
      pinned: true,
    },
  ]

  if (draftId.value) {
    actions.push({
      id: 'deleteDraft',
      label: deletePending.value ? 'Löschen …' : 'Löschen',
      icon: 'trash',
      variant: 'ghost',
      disabled: busy.value,
      pinned: true,
    })
  }

  return actions
})

const formInitial = computed<Partial<MotionFormValues> | undefined>(() => {
  if (!motion.value) return undefined
  const bodyEmpty = !motion.value.bodyHtml.replace(/<[^>]*>/g, '').trim()
  const topic =
    motion.value.topic === 'sonstiges' &&
    !motion.value.title.trim() &&
    !motion.value.summary.trim() &&
    bodyEmpty
      ? ''
      : motion.value.topic
  return {
    title: motion.value.title,
    summary: motion.value.summary,
    topic,
    divisionId: motion.value.divisionId,
    bodyHtml: motion.value.bodyHtml,
    isAnonymous: motion.value.isAnonymous,
  }
})

useHead({
  title: () => {
    const title = motion.value?.title?.trim()
    if (title) return `Bearbeiten: ${title} — FreiWerk`
    return 'Antrag stellen — FreiWerk'
  },
})

function onFormChange() {
  if (savePending.value || publishPending.value) return
  if (formRef.value?.isDirty()) {
    saveStatus.value = 'dirty'
  }
}

async function persistDraft(): Promise<boolean> {
  const form = formRef.value
  if (!form) return false
  if (!form.isDirty()) {
    if (saveStatus.value === 'dirty') saveStatus.value = 'saved'
    return true
  }

  const values = form.getDraftValues()

  savePending.value = true
  saveStatus.value = 'saving'
  saveError.value = ''
  try {
    if (!draftId.value) {
      const res = await $fetch<{ motion: { id: string } }>('/api/motions', {
        method: 'POST',
        body: values,
      })
      draftId.value = res.motion.id
      form.markSaved()
      await router.replace(`/motions/${draftId.value}/edit`)
    } else {
      await $fetch(`/api/motions/${draftId.value}`, { method: 'PATCH', body: values })
      form.markSaved()
    }
    saveStatus.value = 'saved'
    return true
  } catch (err: unknown) {
    saveStatus.value = 'error'
    saveError.value = extractError(err, 'Speichern fehlgeschlagen.')
    return false
  } finally {
    savePending.value = false
  }
}

async function autoSaveDraft() {
  if (busy.value) return
  await persistDraft()
}

async function onClose() {
  formError.value = ''
  const saved = await persistDraft()
  if (!saved) {
    if (saveError.value) formError.value = saveError.value
    return
  }
  await navigateTo(draftId.value ? `/motions/${draftId.value}` : '/motions')
}

function openPublishModal() {
  const form = formRef.value
  if (!form) return

  formError.value = ''
  publishError.value = ''
  if (!form.validateForPublish()) return

  debateDays.value = DEFAULT_DEBATE_DAYS
  publishModalOpen.value = true
}

async function confirmPublish() {
  const form = formRef.value
  if (!form) return

  formError.value = ''
  publishError.value = ''
  if (!form.validateForPublish()) {
    publishModalOpen.value = false
    return
  }

  publishPending.value = true
  try {
    const saved = await persistDraft()
    if (!saved || !draftId.value) {
      publishError.value = saveError.value || 'Speichern fehlgeschlagen.'
      return
    }

    await $fetch(`/api/motions/${draftId.value}/publish`, {
      method: 'POST',
      body: { debateDays: debateDays.value },
    })
    publishModalOpen.value = false
    await navigateTo(`/motions/${draftId.value}`)
  } catch (err: unknown) {
    publishError.value = extractError(err, 'Veröffentlichen fehlgeschlagen.')
  } finally {
    publishPending.value = false
  }
}

async function onDelete() {
  if (!draftId.value) return

  const values = formRef.value?.getDraftValues()
  deleteHasContent.value = values ? !isMotionDraftEmpty(values) : false

  if (deleteHasContent.value) {
    formError.value = ''
    deleteModalOpen.value = true
    return
  }

  if (!confirm('Diesen Entwurf endgültig löschen?')) return
  await executeDelete()
}

async function executeDelete() {
  if (!draftId.value) return
  deletePending.value = true
  try {
    await $fetch(`/api/motions/${draftId.value}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    await navigateTo('/motions')
  } catch (err: unknown) {
    formError.value = extractError(err, 'Löschen fehlgeschlagen.')
  } finally {
    deletePending.value = false
  }
}

async function confirmDelete() {
  await executeDelete()
}

function onBarAction(actionId: string) {
  if (actionId === 'publish') openPublishModal()
  else if (actionId === 'close') void onClose()
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
  <article class="motion">
    <MotionForm
      v-if="!motionId || motion"
      ref="formRef"
      layout="motion"
      pinned-action-bar
      pinned-action-bar-flow
      hide-submit
      hide-actions
      :initial="formInitial"
      @change="onFormChange"
    >
      <template #editor-status>
        <span
          class="editor-status"
          :class="{
            'editor-status--saved': saveStatus === 'saved',
            'editor-status--error': saveStatus === 'error',
          }"
          aria-live="polite"
        >
          <FontAwesomeIcon v-if="saveStatus === 'saved'" icon="circle-check" />
          {{ saveStatusLabel }}
        </span>
      </template>
      <template #footer>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <p v-if="publishError" class="form-error">{{ publishError }}</p>
        <MotionActionBar flow :actions="barActions" @action="onBarAction" />
      </template>
    </MotionForm>

    <MotionPublishModal
      v-model:open="publishModalOpen"
      v-model:debate-days="debateDays"
      :pending="publishPending"
      :error="publishError"
      @confirm="confirmPublish"
    />

    <MotionDraftDeleteModal
      v-model:open="deleteModalOpen"
      :has-content="deleteHasContent"
      :pending="deletePending"
      :error="formError"
      @confirm="confirmDelete"
    />
  </article>
</template>
