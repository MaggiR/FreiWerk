<script setup lang="ts">
const { loggedIn, user, logout } = useAuthUser()
const menuOpen = ref(false)

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <NuxtLink to="/" class="brand" aria-label="FreiWerk Startseite">
        <span class="brand__mark"><FontAwesomeIcon icon="scale-balanced" /></span>
        <span class="brand__name">FreiWerk</span>
      </NuxtLink>

      <button
        class="header__burger"
        type="button"
        aria-label="Menü umschalten"
        @click="menuOpen = !menuOpen"
      >
        <FontAwesomeIcon icon="bars" />
      </button>

      <nav class="nav" :class="{ 'nav--open': menuOpen }">
        <NuxtLink to="/motions" class="nav__link">Anträge</NuxtLink>
        <NuxtLink v-if="loggedIn" to="/motions/new" class="nav__link nav__link--cta">
          <FontAwesomeIcon icon="plus" /> Antrag stellen
        </NuxtLink>

        <ThemeToggle />

        <template v-if="loggedIn">
          <span class="nav__user">
            <FontAwesomeIcon icon="user" /> {{ user?.displayName }}
          </span>
          <FwButton variant="ghost" @click="logout">
            <FontAwesomeIcon icon="right-from-bracket" /> Abmelden
          </FwButton>
        </template>
        <template v-else>
          <NuxtLink to="/auth/login" class="nav__link">Anmelden</NuxtLink>
          <NuxtLink to="/auth/register">
            <FwButton variant="secondary">Registrieren</FwButton>
          </NuxtLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--header-height);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
.header__inner {
  height: 100%;
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-text);
  text-decoration: none;
}
.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--brand-yellow);
  color: var(--brand-blue);
}
.nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.nav__link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}
.nav__link:hover {
  color: var(--color-accent);
}
.nav__link--cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.nav__user {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.9rem;
}
.header__burger {
  display: none;
  font-size: 1.25rem;
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
}

@media (max-width: 760px) {
  .header__burger {
    display: inline-flex;
  }
  .nav {
    position: absolute;
    top: var(--header-height);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    transform: translateY(-12px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .nav--open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
