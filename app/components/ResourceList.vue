<script setup lang="ts">
import type { ResourceItem, ResourceListResponse } from '#shared/types'
import {
  PROPOSAL_STATUS_LABELS,
  RESOURCE_TITLE_MIN,
  RESOURCE_TITLE_MAX,
} from '#shared/constants'
import { resourceDisplayTitle, resourceFileExtension } from '~/utils/resources'
import { formatAddedAt, formatDateTime } from '~/utils/format'

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

function fileExtension(resource: ResourceItem): string | null {
  return resourceFileExtension(resource.title, resource.url, resource.kind)
}

function displayTitle(resource: ResourceItem): string {
  return resourceDisplayTitle(resource.title, fileExtension(resource))
}

defineExpose({
  openSuggestForm: openForm,
  suggestLabel: addLabel,
})
</script>

<template>
  <div class="res">
    <p v-if="pending" class="res__loading">Ressourcen werden geladen …</p>

    <div v-else class="res__list">
      <ul v-if="resources.length > 0" class="res__items">
      <li
        v-for="resource in resources"
        :key="resource.id"
        class="res__item"
        :class="{ 'res__item--pending': resource.status !== 'accepted' }"
      >
        <div class="res__votes">
          <UpvoteButton
            class="res__upvote"
            target-type="resource"
            :target-id="resource.id"
            :count="resource.upvoteCount"
            :upvoted="resource.upvotedByMe"
            layout="stacked"
            context-label="Ressource"
          />
        </div>

        <div class="res__body">
          <div class="res__title-row">
            <FontAwesomeIcon
              :icon="resource.kind === 'file' ? 'file-lines' : 'link'"
              class="res__type-icon"
              aria-hidden="true"
            />
            <span class="res__title">{{ displayTitle(resource) }}</span>
            <FwBadge
              v-if="fileExtension(resource)"
              class="res__ext-chip"
              tone="neutral"
            >
              {{ fileExtension(resource)!.toUpperCase() }}
            </FwBadge>
          </div>
          <p v-if="resource.description" class="res__desc">{{ resource.description }}</p>
          <div class="res__meta">
            <NuxtLink
              v-if="resource.authorId"
              :to="`/users/${resource.authorId}`"
              class="res__meta-item res__author-link"
            >
              <FontAwesomeIcon icon="user" />
              <span>{{ resource.authorName ?? 'Unbekannt' }}</span>
            </NuxtLink>
            <span v-else class="res__meta-item res__author-link">
              <FontAwesomeIcon icon="user" />
              <span>{{ resource.authorName ?? 'Unbekannt' }}</span>
            </span>
            <span class="res__meta-sep" aria-hidden="true">·</span>
            <time
              class="res__meta-item res__date"
              :datetime="resource.createdAt"
              :title="formatDateTime(resource.createdAt)"
            >
              {{ formatAddedAt(resource.createdAt) }}
            </time>
            <template v-if="resource.status !== 'accepted'">
              <span class="res__meta-sep" aria-hidden="true">·</span>
              <span
                class="res__meta-item res__status"
                :class="{ 'res__status--rejected': resource.status === 'rejected' }"
              >
                <FontAwesomeIcon
                  :icon="resource.status === 'rejected' ? 'circle-xmark' : 'hourglass-end'"
                />
                {{ PROPOSAL_STATUS_LABELS[resource.status] }}
              </span>
            </template>
          </div>
          <div v-if="canModerate && resource.status === 'proposed'" class="res__mod">
            <button
              type="button"
              class="res__mod-btn res__mod-btn--accept"
              @click="moderate(resource, 'accepted')"
            >
              <FontAwesomeIcon icon="check" /> Annehmen
            </button>
            <button
              type="button"
              class="res__mod-btn res__mod-btn--reject"
              @click="moderate(resource, 'rejected')"
            >
              <FontAwesomeIcon icon="xmark" /> Ablehnen
            </button>
          </div>
        </div>

        <a
          :href="resource.url"
          class="res__action"
          :aria-label="resource.kind === 'file' ? 'Herunterladen' : 'Link öffnen'"
          :download="resource.kind === 'file' ? displayTitle(resource) : undefined"
          :target="resource.kind === 'link' ? '_blank' : undefined"
          :rel="resource.kind === 'link' ? 'noopener noreferrer' : undefined"
        >
          <FontAwesomeIcon
            class="res__action-icon"
            :icon="resource.kind === 'file' ? 'download' : 'up-right-from-square'"
          />
        </a>
      </li>
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
.res__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.res__item--pending {
  border-style: dashed;
}
.res__votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2.75rem;
}
.res__upvote {
  flex-shrink: 0;
}
.res__body {
  flex: 1;
  min-width: 0;
}
.res__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.res__type-icon {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-tertiary);
}
.res__title {
  font-weight: 700;
  color: var(--color-text);
  overflow-wrap: break-word;
}
.res__ext-chip {
  flex-shrink: 0;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}
.res__desc {
  margin: var(--space-1) 0 0;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  overflow-wrap: break-word;
}
.res__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.res__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.res__meta-sep {
  user-select: none;
}
.res__author-link {
  color: inherit;
  text-decoration: none;
}
a.res__author-link:hover {
  color: var(--color-accent);
}
.res__status {
  font-size: 0.72rem;
  font-weight: 600;
}
.res__status svg {
  font-size: 0.68rem;
}
.res__status--rejected {
  color: var(--color-danger);
}
.res__action {
  flex-shrink: 0;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid color-mix(in srgb, var(--color-tertiary) 35%, var(--color-border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-tertiary) 10%, var(--color-bg));
  color: var(--color-tertiary);
  text-decoration: none;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}
.res__action-icon {
  font-size: 1.45rem;
  line-height: 1;
}
.res__action:hover {
  border-color: color-mix(in srgb, var(--color-tertiary) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-tertiary) 18%, var(--color-bg));
  color: var(--color-tertiary);
}
@container res (max-width: 559px) {
  .res__item {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .res__votes {
    width: auto;
  }
  .res__body {
    flex: 1 1 calc(100% - 3.5rem);
    min-width: min(100%, 12rem);
  }
  .res__action {
    margin-left: auto;
    width: 2.75rem;
    height: 2.75rem;
  }
  .res__action-icon {
    font-size: 1.2rem;
  }
}
.res__mod {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.res__mod-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.2rem var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.res__mod-btn--accept:hover {
  border-color: var(--color-success);
  color: var(--color-success);
}
.res__mod-btn--reject:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
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
