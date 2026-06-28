<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { user, needsOnboarding, refreshSession } = useAuthUser()

useHead({ title: 'Willkommen — FreiWerk' })

function safeRedirect(target: unknown): string {
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/'
}

// Already onboarded members have no business here.
if (!needsOnboarding.value) {
  await navigateTo(safeRedirect(route.query.redirect), { replace: true })
}

const form = reactive({
  firstName: '',
  lastName: '',
  fn: '',
  avatarUrl: null as string | null,
})

const error = ref('')
const pending = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const cropOpen = ref(false)
const cropSrc = ref('')
const cropMime = ref('image/jpeg')
let cropObjectUrl: string | null = null

function openFilePicker() {
  fileInput.value?.click()
}

function closeCrop() {
  cropOpen.value = false
  cropSrc.value = ''
  if (cropObjectUrl) {
    URL.revokeObjectURL(cropObjectUrl)
    cropObjectUrl = null
  }
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

onUnmounted(closeCrop)

async function onSubmit() {
  error.value = ''
  if (form.firstName.trim().length < 1 || form.lastName.trim().length < 1) {
    error.value = 'Bitte gib Vor- und Nachnamen an.'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/users/onboarding', {
      method: 'POST',
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fn: form.fn,
        avatarUrl: form.avatarUrl,
      },
    })
    await refreshSession()
    await navigateTo(safeRedirect(route.query.redirect), { replace: true })
  } catch (err: unknown) {
    error.value = extractError(err, 'Einrichtung konnte nicht gespeichert werden.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="onboarding">
    <FwCard class="onboarding__card" glass pad>
      <div class="onboarding__head">
        <FwBadge tone="primary">Erste Einrichtung</FwBadge>
        <h1 class="onboarding__title">Willkommen bei FreiWerk</h1>
        <p class="onboarding__sub">
          Schön, dass du dabei bist<template v-if="user?.email">, {{ user.email }}</template>.
          Vervollständige kurz dein Profil, damit andere Mitglieder wissen, wer
          Anträge stellt und mitdebattiert.
        </p>
      </div>

      <form class="onboarding__form" @submit.prevent="onSubmit">
        <div class="onboarding__avatar">
          <div class="onboarding__avatar-preview" aria-hidden="true">
            <img
              v-if="form.avatarUrl"
              :src="form.avatarUrl"
              alt=""
              class="onboarding__avatar-image"
            >
            <FontAwesomeIcon v-else icon="user" />
          </div>
          <div class="onboarding__avatar-actions">
            <span class="onboarding__avatar-label">Profilbild (optional)</span>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="onboarding__file"
              @change="onAvatarSelected"
            >
            <FwButton
              type="button"
              variant="ghost"
              :disabled="pending || uploading"
              @click="openFilePicker"
            >
              <FontAwesomeIcon icon="paperclip" />
              {{ uploading ? 'Wird hochgeladen …' : 'Bild auswählen' }}
            </FwButton>
            <button
              v-if="form.avatarUrl"
              type="button"
              class="onboarding__remove"
              :disabled="pending || uploading"
              @click="removeAvatar"
            >
              Bild entfernen
            </button>
          </div>
        </div>

        <div class="onboarding__row">
          <label class="field">
            <span>Vorname</span>
            <input
              v-model="form.firstName"
              type="text"
              required
              maxlength="60"
              autocomplete="given-name"
              placeholder="Max"
            >
          </label>
          <label class="field">
            <span>Nachname</span>
            <input
              v-model="form.lastName"
              type="text"
              required
              maxlength="60"
              autocomplete="family-name"
              placeholder="Mustermann"
            >
          </label>
        </div>

        <label class="field">
          <span>Funktion / Rolle (optional)</span>
          <input
            v-model="form.fn"
            type="text"
            maxlength="120"
            placeholder="z. B. Mitglied LFA Wirtschaft"
          >
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <FwButton type="submit" :disabled="pending || uploading || cropOpen" block>
          {{ pending ? 'Wird gespeichert …' : 'Einrichtung abschließen' }}
          <FontAwesomeIcon v-if="!pending" icon="arrow-right" />
        </FwButton>
      </form>
    </FwCard>

    <AvatarCropModal
      :open="cropOpen"
      :src="cropSrc"
      :mime-type="cropMime"
      @close="closeCrop"
      @confirm="onCropConfirm"
    />
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  justify-content: center;
  padding: var(--space-5) var(--space-4);
}

.onboarding__card {
  width: 100%;
  max-width: 560px;
}

.onboarding__head {
  margin-bottom: var(--space-5);
}

.onboarding__title {
  margin: var(--space-3) 0 var(--space-2);
  font-size: 1.6rem;
}

.onboarding__sub {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.onboarding__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.onboarding__avatar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.onboarding__avatar-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 2rem;
  overflow: hidden;
}

.onboarding__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.onboarding__avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.onboarding__avatar-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.onboarding__file {
  display: none;
}

.onboarding__remove {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.onboarding__remove:hover:not(:disabled) {
  color: var(--color-accent);
}

.onboarding__remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.onboarding__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 560px) {
  .onboarding__row {
    grid-template-columns: 1fr;
  }
}
</style>
