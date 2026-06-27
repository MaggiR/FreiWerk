<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { open: openAuthModal } = useAuthModal()
const { expanded: sidebarPinned } = useAppSidebar()

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
  <div
    class="app-shell"
    :class="{ 'app-shell--sidebar-pinned': sidebarPinned }"
  >
    <AppHeader />
    <AppSidebar />
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
  --sidebar-inset: 0px;
}

.app-main {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  padding: calc(var(--header-total-height) + var(--space-6)) var(--space-4) var(--space-8);
  box-sizing: border-box;
}

.app-footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-5) var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  box-sizing: border-box;
}

/* Tablet/desktop: reserve sidebar width; pinned state uses the expanded rail. */
@media (min-width: 768px) {
  .app-shell {
    --sidebar-inset: var(--rail-collapsed);
  }

  .app-shell--sidebar-pinned {
    --sidebar-inset: var(--rail-expanded);
  }

  .app-main {
    margin-left: var(--sidebar-inset);
    width: calc(100% - var(--sidebar-inset));
    max-width: none;
    padding-top: var(--space-6);
    padding-left: var(--space-5);
    padding-right: var(--space-4);
    transition:
      margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Side margins shrink before the content column narrows below --layout-max-width. */
  .app-main > :deep(*) {
    width: 100%;
    max-width: var(--layout-max-width);
    margin-inline: auto;
  }

  .app-footer {
    margin-left: var(--sidebar-inset);
    width: calc(100% - var(--sidebar-inset));
    transition:
      margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-main,
  .app-footer {
    transition: none;
  }
}
</style>
