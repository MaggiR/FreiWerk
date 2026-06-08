<script setup lang="ts">
const { loggedIn, user, logout } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const menuOpen = ref(false)

const myMotionsTo = computed(() => ({
  path: '/motions',
  query: user.value?.id ? { authorId: user.value.id } : {},
}))

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <div class="header-wrap">
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
          <div class="nav-menu">
            <NuxtLink to="/motions" class="nav__link nav-menu__trigger">Anträge</NuxtLink>
            <div v-if="loggedIn" class="nav-menu__panel" role="menu">
              <NuxtLink
                :to="myMotionsTo"
                class="nav-menu__item"
                role="menuitem"
              >
                <FontAwesomeIcon icon="seedling" />
                Meine Anträge
              </NuxtLink>
              <NuxtLink to="/motions/new" class="nav-menu__item" role="menuitem">
                <FontAwesomeIcon icon="plus" />
                Antrag stellen
              </NuxtLink>
            </div>
          </div>

          <ThemeToggle />

          <div v-if="loggedIn" class="user-menu">
            <NuxtLink
              v-if="user?.id"
              :to="`/users/${user.id}`"
              class="user-menu__avatar"
              :aria-label="`Profil von ${user.displayName}`"
            >
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                alt=""
                class="user-menu__avatar-image"
              >
              <FontAwesomeIcon v-else icon="user" />
            </NuxtLink>
            <div class="user-menu__panel" role="menu">
              <button class="user-menu__logout" type="button" role="menuitem" @click="logout">
                <FontAwesomeIcon icon="right-from-bracket" />
                Abmelden
              </button>
            </div>
          </div>
          <button
            v-else
            class="header__login"
            type="button"
            aria-label="Anmelden"
            title="Anmelden"
            @click="openAuthModal('login')"
          >
            <FontAwesomeIcon icon="right-to-bracket" />
          </button>
        </nav>
      </div>
    </header>
  </div>
</template>

<style scoped>
.header-wrap {
  position: fixed;
  top: var(--header-offset-top);
  left: 0;
  right: 0;
  z-index: 50;
  padding: 0 var(--space-4);
  pointer-events: none;
}

.header {
  pointer-events: auto;
  max-width: var(--layout-max-width);
  margin: 0 auto;
  height: var(--header-height);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
}

.header__inner {
  height: 100%;
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
  height: 100%;
}

.nav__link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

.nav__link:hover {
  color: var(--color-accent);
}

.nav-menu {
  position: relative;
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

.nav-menu__trigger {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--space-3);
}

.nav-menu__panel {
  position: absolute;
  top: 100%;
  left: 0;
  width: max-content;
  padding: var(--space-2);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.nav-menu__panel::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--space-3));
  height: var(--space-3);
}

.nav-menu:hover .nav-menu__panel,
.nav-menu:focus-within .nav-menu__panel {
  opacity: 1;
  pointer-events: auto;
}

.nav-menu__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-menu__item:hover {
  background: var(--color-bg);
  color: var(--color-accent);
  text-decoration: none;
}

.user-menu {
  position: relative;
  align-self: stretch;
  display: flex;
  align-items: center;
}

.user-menu__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--brand-yellow);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1rem;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.2s ease;
}

.user-menu__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu__avatar:hover,
.user-menu:focus-within .user-menu__avatar {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.user-menu__panel {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.user-menu__panel::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--space-3));
  height: var(--space-3);
}

.user-menu:hover .user-menu__panel,
.user-menu:focus-within .user-menu__panel {
  opacity: 1;
  pointer-events: auto;
}

.user-menu__logout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease;
}

.user-menu__logout:hover {
  background: var(--color-bg);
}

.header__login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.12s ease;
}

.header__login:hover {
  transform: translateY(-1px);
  background: var(--color-bg);
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
    top: calc(100% + var(--space-2));
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    box-shadow: var(--shadow-md);
    transform: translateY(-8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .nav--open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .header {
    position: relative;
  }

  .nav-menu__panel {
    position: static;
    min-width: 0;
    opacity: 1;
    transform: none;
    pointer-events: auto;
    padding: 0 0 0 var(--space-3);
    margin-top: var(--space-2);
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .nav-menu__item {
    width: auto;
    padding: 0;
  }

  .user-menu__panel {
    position: static;
    min-width: 0;
    opacity: 1;
    transform: none;
    pointer-events: auto;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

}
</style>
