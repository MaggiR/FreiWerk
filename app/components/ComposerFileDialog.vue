<script setup lang="ts">
import type { UploadedFileResult } from '~/utils/uploadResult'

const COMPOSER_MAX_FILES = 10

const UPLOAD_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,video/quicktime'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  uploaded: [files: UploadedFileResult[]]
}>()

const { SESSION_EXPIRED_MESSAGE } = useAuthUser()

const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])
const pending = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    pendingFiles.value = []
    error.value = ''
  }
})

const canAddMore = computed(() => pendingFiles.value.length < COMPOSER_MAX_FILES)

function close() {
  if (!pending.value) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value && !pending.value) {
    open.value = false
  }
}

function openPicker() {
  if (!canAddMore.value) return
  fileInput.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? Array.from(input.files) : []
  input.value = ''
  if (selected.length === 0) return

  error.value = ''
  const remaining = COMPOSER_MAX_FILES - pendingFiles.value.length
  if (selected.length > remaining) {
    error.value = `Es sind höchstens ${COMPOSER_MAX_FILES} Dateien möglich.`
  }
  pendingFiles.value.push(...selected.slice(0, remaining))
}

function removeFile(index: number) {
  pendingFiles.value.splice(index, 1)
  if (pendingFiles.value.length <= COMPOSER_MAX_FILES) {
    error.value = ''
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFile(file: File): Promise<UploadedFileResult> {
  const formData = new FormData()
  formData.append('file', file)
  return $fetch<UploadedFileResult>('/api/uploads', {
    method: 'POST',
    body: formData,
  })
}

async function onSubmit() {
  if (pendingFiles.value.length === 0 || pending.value) return
  error.value = ''
  pending.value = true
  try {
    const uploaded: UploadedFileResult[] = []
    for (const file of pendingFiles.value) {
      uploaded.push(await uploadFile(file))
    }
    emit('uploaded', uploaded)
    open.value = false
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Dateien konnten nicht hochgeladen werden.')
  } finally {
    pending.value = false
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="file-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-dialog-title"
      @click.self="close"
    >
      <FwCard class="file-dialog__card" glass pad>
        <button
          class="file-dialog__close"
          type="button"
          aria-label="Schließen"
          :disabled="pending"
          @click="close"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <h2 id="file-dialog-title" class="file-dialog__title">
          Dateien anhängen
        </h2>
        <p class="file-dialog__lead">
          Bis zu {{ COMPOSER_MAX_FILES }} Dateien (max. 5 MB je Datei). Bilder, PDFs und Videos sind erlaubt.
        </p>

        <input
          ref="fileInput"
          type="file"
          class="visually-hidden"
          multiple
          :accept="UPLOAD_ACCEPT"
          @change="onFilesSelected"
        >

        <ul v-if="pendingFiles.length > 0" class="file-dialog__list">
          <li v-for="(file, index) in pendingFiles" :key="`${file.name}-${index}`" class="file-dialog__item">
            <FontAwesomeIcon class="file-dialog__item-icon" icon="file-lines" />
            <span class="file-dialog__item-name">{{ file.name }}</span>
            <span class="file-dialog__item-size">{{ formatBytes(file.size) }}</span>
            <button
              type="button"
              class="file-dialog__item-remove"
              aria-label="Datei entfernen"
              :disabled="pending"
              @click="removeFile(index)"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </li>
        </ul>

        <p v-else class="file-dialog__empty">
          Noch keine Dateien ausgewählt.
        </p>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="file-dialog__actions">
          <FwButton variant="ghost" type="button" :disabled="pending" @click="close">
            Abbrechen
          </FwButton>
          <FwButton
            variant="secondary"
            type="button"
            :disabled="pending || !canAddMore"
            @click="openPicker"
          >
            <FontAwesomeIcon icon="plus" />
            {{ pendingFiles.length === 0 ? 'Dateien auswählen' : 'Weitere Dateien' }}
          </FwButton>
          <FwButton
            variant="primary"
            type="button"
            :disabled="pending || pendingFiles.length === 0"
            @click="onSubmit"
          >
            <FontAwesomeIcon :icon="pending ? 'hourglass-end' : 'paperclip'" />
            {{ pending ? 'Hochladen …' : 'Einfügen' }}
          </FwButton>
        </div>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.file-dialog {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(3, 45, 103, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.dark .file-dialog {
  background: rgba(0, 0, 0, 0.55);
}
.file-dialog__card {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - var(--space-8));
  overflow-y: auto;
}
.file-dialog__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.file-dialog__close:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg);
}
.file-dialog__title {
  margin: 0 0 var(--space-2);
  padding-right: var(--space-6);
}
.file-dialog__lead {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}
.file-dialog__empty {
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.file-dialog__list {
  margin: 0 0 var(--space-4);
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.file-dialog__item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.file-dialog__item-icon {
  color: var(--color-text-muted);
}
.file-dialog__item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-dialog__item-size {
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  white-space: nowrap;
}
.file-dialog__item-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.file-dialog__item-remove:hover:not(:disabled) {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
.file-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
</style>
