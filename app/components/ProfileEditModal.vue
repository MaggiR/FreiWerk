<script setup lang="ts">
interface ProfileData {
  displayName: string
  fn: string | null
  avatarUrl: string | null
  division: { id: string; name: string } | null
}

const props = defineProps<{
  open: boolean
  profile: ProfileData
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { refreshSession } = useAuthUser()

const { data: divisionData } = await useFetch('/api/divisions')

const form = reactive({
  displayName: '',
  fn: '',
  divisionId: '' as string,
  avatarUrl: null as string | null,
})

const error = ref('')
const pending = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const backdropPressed = ref(false)
const cropOpen = ref(false)
const cropSrc = ref('')
const cropMime = ref('image/jpeg')
let cropObjectUrl: string | null = null

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.displayName = props.profile.displayName
    form.fn = props.profile.fn ?? ''
    form.divisionId = props.profile.division?.id ?? ''
    form.avatarUrl = props.profile.avatarUrl
    error.value = ''
    pending.value = false
    uploading.value = false
    closeCrop()
  },
)

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget) {
    emit('close')
  }
  backdropPressed.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.open) return
  if (cropOpen.value) {
    closeCrop()
    return
  }
  emit('close')
}

function closeCrop() {
  cropOpen.value = false
  cropSrc.value = ''
  if (cropObjectUrl) {
    URL.revokeObjectURL(cropObjectUrl)
    cropObjectUrl = null
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  closeCrop()
})

function openFilePicker() {
  fileInput.value?.click()
}

function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Bitte wähle eine Bilddatei (JPEG, PNG, GIF oder WebP).'
    return
  }

  error.value = ''
  closeCrop()
  cropMime.value =
    file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg'
  cropObjectUrl = URL.createObjectURL(file)
  cropSrc.value = cropObjectUrl
  cropOpen.value = true
}

async function uploadAvatarBlob(blob: Blob) {
  uploading.value = true
  try {
    const extension =
      cropMime.value === 'image/png'
        ? '.png'
        : cropMime.value === 'image/webp'
          ? '.webp'
          : '.jpg'
    const file = new File([blob], `avatar${extension}`, { type: cropMime.value })
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{ url: string }>('/api/uploads', {
      method: 'POST',
      body,
    })
    form.avatarUrl = res.url
  } catch (err: unknown) {
    error.value = extractError(err, 'Profilbild konnte nicht hochgeladen werden.')
  } finally {
    uploading.value = false
  }
}

async function onCropConfirm(blob: Blob) {
  closeCrop()
  await uploadAvatarBlob(blob)
}

function removeAvatar() {
  form.avatarUrl = null
}

async function onSubmit() {
  error.value = ''
  if (form.displayName.trim().length < 2) {
    error.value = 'Der Anzeigename muss mindestens 2 Zeichen haben.'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/users/me', {
      method: 'PATCH',
      body: {
        displayName: form.displayName.trim(),
        fn: form.fn,
        divisionId: form.divisionId || null,
        avatarUrl: form.avatarUrl,
      },
    })
    await refreshSession()
    emit('saved')
    emit('close')
  } catch (err: unknown) {
    error.value = extractError(err, 'Profil konnte nicht gespeichert werden.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="profile-edit"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-title"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <FwCard class="profile-edit__card" glass pad>
        <button
          class="profile-edit__close"
          type="button"
          aria-label="Schließen"
          @click="emit('close')"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <h2 id="profile-edit-title" class="profile-edit__title">Profil bearbeiten</h2>
        <p class="profile-edit__sub">Passe deine öffentlichen Profildaten an.</p>

        <form class="profile-edit__form" @submit.prevent="onSubmit">
          <div class="profile-edit__avatar">
            <div class="profile-edit__avatar-preview" aria-hidden="true">
              <img
                v-if="form.avatarUrl"
                :src="form.avatarUrl"
                alt=""
                class="profile-edit__avatar-image"
              >
              <FontAwesomeIcon v-else icon="user" />
            </div>
            <div class="profile-edit__avatar-actions">
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                class="profile-edit__file"
                @change="onAvatarSelected"
              >
              <FwButton
                type="button"
                variant="ghost"
                :disabled="pending || uploading"
                @click="openFilePicker"
              >
                <FontAwesomeIcon icon="paperclip" />
                {{ uploading ? 'Wird hochgeladen…' : 'Profilbild auswählen' }}
              </FwButton>
              <button
                v-if="form.avatarUrl"
                type="button"
                class="profile-edit__remove"
                :disabled="pending || uploading"
                @click="removeAvatar"
              >
                Profilbild entfernen
              </button>
            </div>
          </div>

          <label class="field">
            <span>Anzeigename</span>
            <input
              v-model="form.displayName"
              type="text"
              required
              maxlength="120"
              autocomplete="name"
            >
          </label>

          <label class="field">
            <span>Funktion / Rolle (optional)</span>
            <input
              v-model="form.fn"
              type="text"
              maxlength="120"
              placeholder="z. B. Mitglied LFA Wirtschaft"
            >
          </label>

          <label class="field">
            <span>Gliederung (optional)</span>
            <select v-model="form.divisionId">
              <option value="">Keine Auswahl</option>
              <option
                v-for="division in divisionData?.divisions ?? []"
                :key="division.id"
                :value="division.id"
              >
                {{ division.name }}
              </option>
            </select>
          </label>

          <p v-if="error" class="form-error">{{ error }}</p>

          <div class="profile-edit__actions">
            <FwButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">
              Abbrechen
            </FwButton>
            <FwButton type="submit" :disabled="pending || uploading || cropOpen">
              {{ pending ? 'Wird gespeichert…' : 'Speichern' }}
            </FwButton>
          </div>
        </form>
      </FwCard>
    </div>

    <AvatarCropModal
      :open="cropOpen"
      :src="cropSrc"
      :mime-type="cropMime"
      @close="closeCrop"
      @confirm="onCropConfirm"
    />
  </Teleport>
</template>

<style scoped>
.profile-edit {
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

.dark .profile-edit {
  background: rgba(0, 0, 0, 0.55);
}

.profile-edit__card {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - var(--space-8));
  overflow-y: auto;
}

.profile-edit__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.profile-edit__close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.profile-edit__title {
  margin: 0 0 var(--space-1);
  font-size: 1.5rem;
}

.profile-edit__sub {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
}

.profile-edit__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.profile-edit__avatar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.profile-edit__avatar-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1.8rem;
  overflow: hidden;
}

.profile-edit__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-edit__avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.profile-edit__file {
  display: none;
}

.profile-edit__remove {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.profile-edit__remove:hover:not(:disabled) {
  color: var(--color-accent);
}

.profile-edit__remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-edit__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
