<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { open: openAuthModal } = useAuthModal()

function syncAuthQuery() {
  const auth = route.query.auth
  if (auth !== 'login' && auth !== 'register') return

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
  openAuthModal(auth, redirect)

  const { auth: _auth, redirect: _redirect, ...rest } = route.query
  router.replace({ path: route.path, query: rest })
}

watch(() => route.query.auth, syncAuthQuery, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <AuthModal />
    <ToastHost />
    <main class="app-main">
      <slot />
    </main>
    <footer class="app-footer">
      <p>FreiWerk — Marktplatz liberaler Ideen. Arbeitstitel.</p>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: calc(var(--header-total-height) + var(--space-6)) var(--space-4) var(--space-8);
}

.app-footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-5) var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
</style>
