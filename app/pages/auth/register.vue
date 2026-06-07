<script setup lang="ts">
const { register, loggedIn } = useAuthUser()

const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

if (loggedIn.value) {
  await navigateTo('/')
}

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    await register({
      displayName: displayName.value,
      email: email.value,
      password: password.value,
    })
    await navigateTo('/')
  } catch (err: unknown) {
    error.value = extractError(err, 'Registrierung fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <FwCard class="auth-card">
      <h1 class="auth-title">Konto erstellen</h1>
      <p class="auth-sub">Bring deine Ideen in die liberale Debatte ein.</p>

      <form class="auth-form" @submit.prevent="onSubmit">
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

      <p class="auth-foot">
        Bereits registriert?
        <NuxtLink to="/auth/login">Zur Anmeldung</NuxtLink>
      </p>
    </FwCard>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding-top: var(--space-6);
}
.auth-card {
  width: 100%;
  max-width: 420px;
}
.auth-title {
  margin: 0 0 var(--space-1);
}
.auth-sub {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.auth-foot {
  margin-top: var(--space-5);
  text-align: center;
  color: var(--color-text-muted);
}
</style>
