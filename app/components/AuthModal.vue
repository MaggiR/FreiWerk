<script setup lang="ts">
const { isOpen, mode, redirectPath, close, switchMode } = useAuthModal()
const { login, register } = useAuthUser()

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const pending = ref(false)
const backdropPressed = ref(false)

watch(isOpen, (open) => {
  if (!open) {
    email.value = ''
    password.value = ''
    displayName.value = ''
    error.value = ''
    pending.value = false
  }
})

watch(mode, () => {
  error.value = ''
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
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function onLoginSubmit() {
  error.value = ''
  pending.value = true
  try {
    await login({ email: email.value, password: password.value })
    const target = redirectPath.value || '/'
    close()
    await navigateTo(target)
  } catch (err: unknown) {
    error.value = extractError(err, 'Anmeldung fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}

async function onRegisterSubmit() {
  error.value = ''
  pending.value = true
  try {
    await register({
      displayName: displayName.value,
      email: email.value,
      password: password.value,
    })
    const target = redirectPath.value || '/'
    close()
    await navigateTo(target)
  } catch (err: unknown) {
    error.value = extractError(err, 'Registrierung fehlgeschlagen.')
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
      :aria-labelledby="mode === 'login' ? 'auth-modal-login-title' : 'auth-modal-register-title'"
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

        <template v-if="mode === 'login'">
          <h2 id="auth-modal-login-title" class="auth-modal__title">Anmelden</h2>
          <p class="auth-modal__sub">Willkommen zurück bei FreiWerk.</p>

          <form class="auth-modal__form" @submit.prevent="onLoginSubmit">
            <label class="field">
              <span>E-Mail</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="demo@freiwerk.local"
              >
            </label>

            <label class="field">
              <span>Passwort</span>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="password123"
              >
            </label>

            <p v-if="error" class="form-error">{{ error }}</p>

            <FwButton type="submit" :disabled="pending" block>
              {{ pending ? 'Anmelden...' : 'Anmelden' }}
            </FwButton>
          </form>

          <p class="auth-modal__foot">
            Noch kein Konto?
            <button type="button" class="auth-modal__switch" @click="switchMode('register')">
              Jetzt registrieren
            </button>
          </p>
        </template>

        <template v-else>
          <h2 id="auth-modal-register-title" class="auth-modal__title">Konto erstellen</h2>
          <p class="auth-modal__sub">Bring deine Ideen in die liberale Debatte ein.</p>

          <form class="auth-modal__form" @submit.prevent="onRegisterSubmit">
            <label class="field">
              <span>Anzeigename</span>
              <input
                v-model="displayName"
                type="text"
                autocomplete="name"
                required
                minlength="2"
                placeholder="Vor- und Nachname"
              >
            </label>

            <label class="field">
              <span>E-Mail</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.org"
              >
            </label>

            <label class="field">
              <span>Passwort</span>
              <input
                v-model="password"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                placeholder="Mindestens 8 Zeichen"
              >
            </label>

            <p v-if="error" class="form-error">{{ error }}</p>

            <FwButton type="submit" :disabled="pending" block>
              {{ pending ? 'Wird erstellt...' : 'Registrieren' }}
            </FwButton>
          </form>

          <p class="auth-modal__foot">
            Bereits registriert?
            <button type="button" class="auth-modal__switch" @click="switchMode('login')">
              Zur Anmeldung
            </button>
          </p>
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

.auth-modal__title {
  margin: 0 0 var(--space-1);
  font-size: 1.5rem;
}

.auth-modal__sub {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
}

.auth-modal__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-modal__foot {
  margin: var(--space-5) 0 0;
  text-align: center;
  color: var(--color-text-muted);
}

.auth-modal__switch {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}
</style>
