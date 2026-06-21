<script setup lang="ts">
const { loggedIn, user, logout, isModerator } = useAuthUser()
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
          :aria-expanded="menuOpen"
          aria-controls="main-nav"
          aria-label="Menü umschalten"
          @click="menuOpen = !menuOpen"
        >
          <FontAwesomeIcon :icon="menuOpen ? 'xmark' : 'bars'" />
        </button>

        <nav
          id="main-nav"
          class="nav"
          :class="{ 'nav--open': menuOpen }"
          aria-label="Hauptnavigation"
        >
          <div class="nav-links">
            <NuxtLink to="/motions" class="nav__link nav__link--primary">
              Anträge
            </NuxtLink>
            <div v-if="loggedIn" class="nav-links__sub" role="menu">
              <NuxtLink
                :to="myMotionsTo"
                class="nav__link nav__link--sub"
                role="menuitem"
              >
                <FontAwesomeIcon icon="seedling" aria-hidden="true" />
                Meine Anträge
              </NuxtLink>
              <NuxtLink
                to="/motions/new"
                class="nav__link nav__link--sub"
                role="menuitem"
              >
                <FontAwesomeIcon icon="plus" aria-hidden="true" />
                Antrag stellen
              </NuxtLink>
            </div>
          </div>

          <NuxtLink
            v-if="isModerator"
            to="/moderation"
            class="nav__link nav__link--primary"
          >
            <FontAwesomeIcon icon="shield-halved" aria-hidden="true" />
            Moderation
          </NuxtLink>

          <div class="nav-actions">
            <ThemeToggle />

            <div v-if="loggedIn" class="nav-actions__user">
              <NuxtLink
                v-if="user?.id"
                :to="`/users/${user.id}`"
                class="nav-actions__profile"
                :aria-label="`Profil von ${user.displayName}`"
              >
                <span class="nav-actions__avatar">
                  <img
                    v-if="user.avatarUrl"
                    :src="user.avatarUrl"
                    alt=""
                    class="nav-actions__avatar-image"
                  >
                  <FontAwesomeIcon v-else icon="user" aria-hidden="true" />
                </span>
                <span class="nav-actions__name">{{ user.displayName }}</span>
              </NuxtLink>
              <div class="nav-actions__panel" role="menu">
                <button
                  class="nav-actions__logout"
                  type="button"
                  role="menuitem"
                  @click="logout"
                >
                  <FontAwesomeIcon icon="right-from-bracket" aria-hidden="true" />
                  Abmelden
                </button>
              </div>
            </div>
            <button
              v-else
              class="nav-actions__login"
              type="button"
              @click="openAuthModal('login')"
            >
              <FontAwesomeIcon icon="right-to-bracket" aria-hidden="true" />
              Anmelden
            </button>
          </div>
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
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s ease, background 0.2s ease;
}

.nav__link:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.nav-links {
  position: relative;
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

.nav__link--primary {
  height: 100%;
  padding: 0 var(--space-3);
}

.nav-links__sub {
  position: absolute;
  top: 100%;
  left: 0;
  width: max-content;
  min-width: 12rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.nav-links__sub::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--space-3));
  height: var(--space-3);
}

@media (min-width: 761px) {
  .nav-links:hover .nav-links__sub,
  .nav-links:focus-within .nav-links__sub {
    opacity: 1;
    pointer-events: auto;
  }
}

.nav__link--sub {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
}

.nav__link--sub:hover {
  background: var(--color-bg);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-actions__user {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-actions__profile {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: inherit;
}

.nav-actions__avatar {
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
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.12s ease, box-shadow 0.2s ease;
}

.nav-actions__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-actions__profile:hover .nav-actions__avatar {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.nav-actions__name {
  display: none;
  font-weight: 600;
  color: var(--color-text);
}

.nav-actions__panel {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 200px;
  padding: var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.nav-actions__panel::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--space-3));
  height: var(--space-3);
}

@media (min-width: 761px) {
  .nav-actions__user:hover .nav-actions__panel,
  .nav-actions__user:focus-within .nav-actions__panel {
    opacity: 1;
    pointer-events: auto;
  }
}

.nav-actions__logout,
.nav-actions__login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.12s ease;
  white-space: nowrap;
}

.nav-actions__logout:hover,
.nav-actions__login:hover {
  background: var(--color-bg);
  transform: translateY(-1px);
}

.header__burger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
}

@media (max-width: 760px) {
  .header__inner {
    position: relative;
  }

  .header__burger {
    display: inline-flex;
  }

  .nav {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    right: 0;
    z-index: 1;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    height: auto;
    padding: var(--space-2);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    transform: translateY(-8px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
  }

  .nav--open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .nav-links {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .nav__link--primary,
  .nav__link--sub {
    width: 100%;
    height: auto;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
  }

  .nav-links__sub {
    position: static;
    width: 100%;
    min-width: 0;
    opacity: 1;
    pointer-events: auto;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    gap: 0;
  }

  .nav-links__sub::before {
    display: none;
  }

  .nav__link--sub {
    padding-left: calc(var(--space-4) + var(--space-5));
  }

  .nav__link--primary:hover,
  .nav__link--sub:hover {
    background: var(--color-bg);
  }

  .nav-actions {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    margin-top: var(--space-2);
    padding: var(--space-3) var(--space-2) var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .nav-actions__user {
    display: contents;
  }

  .nav-actions__name {
    display: inline;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-actions__profile {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }

  .nav-actions__profile:hover .nav-actions__avatar {
    transform: none;
    box-shadow: none;
  }

  .nav-actions__panel {
    grid-column: 1 / -1;
    grid-row: 2;
    position: static;
    min-width: 0;
    padding: 0;
    opacity: 1;
    pointer-events: auto;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .nav-actions__panel::before {
    display: none;
  }

  .nav-actions__login {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .nav-actions__logout,
  .nav-actions__login {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    transform: none;
  }

  .nav-actions__logout:hover,
  .nav-actions__login:hover {
    transform: none;
  }
}
</style>
