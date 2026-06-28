<script setup lang="ts">
import type { ResourceItem, ResourceListResponse } from '#shared/types'
import {
  RESOURCE_TITLE_MIN,
  RESOURCE_TITLE_MAX,
} from '#shared/constants'

const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const itemCount = defineModel<number>('itemCount', { default: 0 })

const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const toast = useToast()

const { data, refresh, pending } = useFetch<ResourceListResponse>(
  () => `/api/motions/${props.motionId}/resources`,
  { key: computed(() => `resources-${props.motionId}`) },
)

const canModerate = computed(() => data.value?.canModerate ?? false)
const resources = computed<ResourceItem[]>(() => {
  const list = [...(data.value?.resources ?? [])]
  return list.sort((a, b) => b.upvoteCount - a.upvoteCount)
})

watchEffect(() => {
  itemCount.value = resources.value.length
})

// ---- proposal form ----
const showForm = ref(false)
const formTitle = ref('')
const formDescription = ref('')
const formKind = ref<'link' | 'file'>('link')
const formUrl = ref('')
const formFileName = ref('')
const uploading = ref(false)
const submitting = ref(false)
const formError = ref('')

const titleLen = computed(() => formTitle.value.trim().length)
const canSubmit = computed(
  () =>
    titleLen.value >= RESOURCE_TITLE_MIN &&
    titleLen.value <= RESOURCE_TITLE_MAX &&
    formUrl.value.trim().length > 0 &&
    !submitting.value &&
    !uploading.value,
)

const addLabel = computed(() =>
  resources.value.length === 0 ? 'Erste Ressource hinzufügen' : 'Ressource vorschlagen',
)

function openForm() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  formError.value = ''
  showForm.value = true
}

function resetForm() {
  showForm.value = false
  formTitle.value = ''
  formDescription.value = ''
  formKind.value = 'link'
  formUrl.value = ''
  formFileName.value = ''
  formError.value = ''
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  formError.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ url: string; name: string }>('/api/uploads', {
      method: 'POST',
      body: form,
    })
    formUrl.value = res.url
    formFileName.value = res.name
  } catch (err: unknown) {
    formError.value = extractError(err, 'Datei-Upload fehlgeschlagen.')
  } finally {
    uploading.value = false
  }
}

async function submitResource() {
  if (!canSubmit.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch(`/api/motions/${props.motionId}/resources`, {
      method: 'POST',
      body: {
        title: formTitle.value.trim(),
        description: formDescription.value.trim() || undefined,
        kind: formKind.value,
        url: formUrl.value.trim(),
      },
    })
    resetForm()
    await refresh()
    toast.success(
      canModerate.value ? 'Ressource hinzugefügt.' : 'Ressource zur Prüfung eingereicht.',
    )
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      formError.value = SESSION_EXPIRED_MESSAGE
      return
    }
    formError.value = extractError(err, 'Ressource konnte nicht gespeichert werden.')
  } finally {
    submitting.value = false
  }
}

async function moderate(resource: ResourceItem, status: 'accepted' | 'rejected') {
  try {
    await $fetch(`/api/resources/${resource.id}`, {
      method: 'PATCH',
      body: { status },
    })
    await refresh()
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  }
}

defineExpose({
  openSuggestForm: openForm,
  suggestLabel: addLabel,
})
</script>

<template>
  <div class="res" lang="de">
    <p v-if="pending" class="res__loading">Ressourcen werden geladen …</p>

    <div v-else class="res__list">
      <ul v-if="resources.length > 0" class="res__items">
        <ResourceListItem
          v-for="resource in resources"
          :key="resource.id"
          :resource="resource"
          :can-moderate="canModerate"
          @moderate="(status) => moderate(resource, status)"
        />
      </ul>
    </div>

    <div v-if="showForm" class="res__form-overlay" @click.self="resetForm">
      <form class="res__form" @submit.prevent="submitResource">
        <h3 class="res__form-head">Ressource vorschlagen</h3>

        <div class="res__kind-toggle">
          <button
            type="button"
            :class="{ 'is-active': formKind === 'link' }"
            @click="formKind = 'link'; formUrl = ''; formFileName = ''"
          >
            <FontAwesomeIcon icon="link" /> Link
          </button>
          <button
            type="button"
            :class="{ 'is-active': formKind === 'file' }"
            @click="formKind = 'file'; formUrl = ''; formFileName = ''"
          >
            <FontAwesomeIcon icon="paperclip" /> Datei
          </button>
        </div>

        <input
          v-model="formTitle"
          type="text"
          class="res__form-input"
          placeholder="Titel der Ressource …"
          :maxlength="RESOURCE_TITLE_MAX"
        >

        <textarea
          v-model="formDescription"
          class="res__form-input res__form-textarea"
          rows="2"
          maxlength="500"
          placeholder="Kurzbeschreibung (optional) …"
        />

        <input
          v-if="formKind === 'link'"
          v-model="formUrl"
          type="url"
          class="res__form-input"
          placeholder="https://…"
        >
        <div v-else class="res__file">
          <input type="file" @change="onFileChange">
          <p v-if="uploading" class="app-hint">Datei wird hochgeladen …</p>
          <p v-else-if="formFileName" class="res__file-name">
            <FontAwesomeIcon icon="check" /> {{ formFileName }}
          </p>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
        <p v-if="!canModerate" class="app-hint res__form-hint">
          Vorgeschlagene Ressourcen werden vom Antragsteller geprüft, bevor sie
          öffentlich erscheinen.
        </p>

        <div class="res__form-actions">
          <FwButton type="button" variant="ghost" @click="resetForm">Abbrechen</FwButton>
          <FwButton type="submit" variant="primary" :disabled="!canSubmit">
            {{ submitting ? 'Speichern …' : canModerate ? 'Hinzufügen' : 'Einreichen' }}
          </FwButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.res {
  container-type: inline-size;
  container-name: res;
  min-width: 0;
}
.res__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.res__loading {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.res__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.res__form-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.45);
}
.res__form {
  width: min(36rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-md);
}
.res__form-head {
  margin: 0 0 var(--space-3);
}
.res__kind-toggle {
  display: inline-flex;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
  padding: 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
}
.res__kind-toggle button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.25rem var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.res__kind-toggle button.is-active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.res__form-input {
  width: 100%;
  margin-bottom: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}
.res__form-textarea {
  resize: vertical;
}
.res__file {
  margin-bottom: var(--space-3);
}
.res__file-name {
  margin: var(--space-1) 0 0;
  font-size: 0.85rem;
  color: var(--color-success);
}
.res__form-hint {
  margin-bottom: var(--space-3);
}
.res__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
