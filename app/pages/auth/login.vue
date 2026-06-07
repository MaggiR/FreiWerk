<script setup lang="ts">
const { login, loggedIn } = useAuthUser()
const route = useRoute()

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
    await login({ email: email.value, password: password.value })
    const redirect = (route.query.redirect as string) || '/'
    await navigateTo(redirect)
  } catch (err: unknown) {
    error.value = extractError(err, 'Anmeldung fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <FwCard class="auth-card">
      <h1 class="auth-title">Anmelden</h1>
      <p class="auth-sub">Willkommen zurück bei FreiWerk.</p>

      <form class="auth-form" @submit.prevent="onSubmit">
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

      <p class="auth-foot">
        Noch kein Konto?
        <NuxtLink to="/auth/register">Jetzt registrieren</NuxtLink>
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
