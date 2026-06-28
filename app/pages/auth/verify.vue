<script setup lang="ts">
const route = useRoute()
const { refreshSession } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

useHead({ title: 'Anmeldung — FreiWerk' })

type State = 'verifying' | 'error'
const state = ref<State>('verifying')
const errorMessage = ref('')

interface VerifyResponse {
  user: { needsOnboarding: boolean }
  needsOnboarding: boolean
  redirect: string | null
}

function safeRedirect(target: string | null): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/'
}

async function verify() {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    state.value = 'error'
    errorMessage.value = 'Es wurde kein Anmeldelink übergeben.'
    return
  }

  try {
    const result = await $fetch<VerifyResponse>('/api/auth/magic-link/verify', {
      method: 'POST',
      body: { token },
      credentials: 'include',
    })
    await refreshSession()

    if (result.needsOnboarding) {
      await navigateTo({
        path: '/willkommen',
        query: { redirect: safeRedirect(result.redirect) },
        replace: true,
      })
      return
    }

    await navigateTo(safeRedirect(result.redirect), { replace: true })
  } catch (err: unknown) {
    state.value = 'error'
    errorMessage.value = extractError(
      err,
      'Dieser Anmeldelink ist ungültig oder abgelaufen.',
    )
  }
}

function requestNewLink() {
  openAuthModal('login', '/')
  navigateTo('/')
}

onMounted(verify)
</script>

<template>
  <div class="verify">
    <FwCard class="verify__card" glass pad>
      <template v-if="state === 'verifying'">
        <div class="verify__icon verify__icon--spin" aria-hidden="true">
          <FontAwesomeIcon icon="spinner" spin />
        </div>
        <h1 class="verify__title">Anmeldung wird geprüft …</h1>
        <p class="verify__sub">Einen Moment, wir melden dich an.</p>
      </template>

      <template v-else>
        <div class="verify__icon verify__icon--error" aria-hidden="true">
          <FontAwesomeIcon icon="triangle-exclamation" />
        </div>
        <h1 class="verify__title">Anmeldung fehlgeschlagen</h1>
        <p class="verify__sub">{{ errorMessage }}</p>
        <div class="verify__actions">
          <FwButton block @click="requestNewLink">
            <FontAwesomeIcon icon="paper-plane" />
            Neuen Anmeldelink anfordern
          </FwButton>
          <NuxtLink to="/" class="verify__home">Zur Startseite</NuxtLink>
        </div>
      </template>
    </FwCard>
  </div>
</template>

<style scoped>
.verify {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-4);
}

.verify__card {
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.verify__icon {
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

.verify__icon--error {
  background: color-mix(in srgb, #d91e36 16%, transparent);
  color: #d91e36;
}

.verify__title {
  margin: 0 0 var(--space-1);
  font-size: 1.4rem;
}

.verify__sub {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
}

.verify__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.verify__home {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
