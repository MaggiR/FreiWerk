<script setup lang="ts">
const { isOpen, redirectPath, close } = useAuthModal()
const { requestMagicLink } = useAuthUser()

type Step = 'request' | 'sent'

const email = ref('')
const step = ref<Step>('request')
const error = ref('')
const pending = ref(false)
const backdropPressed = ref(false)

const route = useRoute()

function reset() {
  email.value = ''
  step.value = 'request'
  error.value = ''
  pending.value = false
}

watch(isOpen, (open) => {
  if (!open) reset()
})

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget) {
    close()
  }
  backdropPressed.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    const target = redirectPath.value ?? route.fullPath
    const result = await requestMagicLink(email.value, target)
    if (result.mode === 'demo') {
      close()
      // The demo account is already onboarded; go to the requested target.
      if (target && target !== route.fullPath) {
        await navigateTo(target)
      }
      return
    }
    step.value = 'sent'
  } catch (err: unknown) {
    error.value = extractError(err, 'Anmeldung fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <FwCard class="auth-modal__card" glass pad>
        <button
          class="auth-modal__close"
          type="button"
          aria-label="Schließen"
          @click="close"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <template v-if="step === 'request'">
          <div class="auth-modal__icon" aria-hidden="true">
            <FontAwesomeIcon icon="wand-magic-sparkles" />
          </div>
          <h2 id="auth-modal-title" class="auth-modal__title">Anmelden ohne Passwort</h2>
          <p class="auth-modal__sub">
            Gib deine E-Mail-Adresse ein. Wir senden dir einen sicheren
            Anmeldelink — kein Passwort nötig.
          </p>

          <form class="auth-modal__form" @submit.prevent="onSubmit">
            <label class="field">
              <span>E-Mail-Adresse</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.org"
              >
            </label>

            <p v-if="error" class="form-error">{{ error }}</p>

            <FwButton type="submit" :disabled="pending" block>
              <FontAwesomeIcon v-if="!pending" icon="paper-plane" />
              {{ pending ? 'Wird gesendet …' : 'Anmeldelink senden' }}
            </FwButton>
          </form>
        </template>

        <template v-else>
          <div class="auth-modal__icon auth-modal__icon--success" aria-hidden="true">
            <FontAwesomeIcon icon="envelope-circle-check" />
          </div>
          <h2 id="auth-modal-title" class="auth-modal__title">E-Mail unterwegs</h2>
          <p class="auth-modal__sub">
            Wir haben dir einen Anmeldelink an
            <strong>{{ email }}</strong> geschickt. Öffne die E-Mail und klicke auf
            den Link, um dich anzumelde bzw. zu registrieren.
          </p>
          <p class="auth-modal__hint">
            Der Link ist 30 Minuten gültig. Keine E-Mail erhalten? Prüfe deinen
            Spam-Ordner oder fordere einen neuen Link an.
          </p>

          <div class="auth-modal__actions">
            <FwButton variant="ghost" block @click="step = 'request'">
              Andere Adresse verwenden
            </FwButton>
            <FwButton block @click="close">Schließen</FwButton>
          </div>
        </template>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.auth-modal {
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

.dark .auth-modal {
  background: rgba(0, 0, 0, 0.55);
}

.auth-modal__card {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - var(--space-8));
  overflow-y: auto;
  text-align: center;
}

.auth-modal__close {
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

.auth-modal__close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.auth-modal__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: var(--space-2) auto var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1.5rem;
}

.auth-modal__icon--success {
  background: color-mix(in srgb, #0a9f5e 18%, transparent);
  color: #0a9f5e;
}

.auth-modal__title {
  margin: 0 0 var(--space-1);
  font-size: 1.5rem;
}

.auth-modal__sub {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
}

.auth-modal__hint {
  margin: 0 0 var(--space-5);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.auth-modal__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: left;
}

.auth-modal__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
