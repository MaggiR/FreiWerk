<script setup lang="ts">
const { loggedIn, user, logout, isModerator } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const route = useRoute()
const { expanded, groups, select } = useAppSidebar()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const SIDEBAR_STORAGE_KEY = 'freiwerk-sidebar-expanded'

onMounted(() => {
  expanded.value = localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  nextTick(() => {
    updateFootSeparation()
    if (!scrollRef.value) return
    scrollResizeObserver = new ResizeObserver(() => updateFootSeparation())
    scrollResizeObserver.observe(scrollRef.value)
  })
})

onUnmounted(() => {
  scrollResizeObserver?.disconnect()
})

watch([groups, expanded, loggedIn, () => user.value?.displayName], () => {
  nextTick(updateFootSeparation)
}, { deep: true })

watch(expanded, (value) => {
  if (import.meta.client) localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? '1' : '0')
})

const myMotionsTo = computed(() => ({
  path: '/motions',
  query: user.value?.id ? { authorId: user.value.id } : {},
}))

interface NavLink {
  id: string
  label: string
  icon: string
  to: string | Record<string, unknown>
  active: boolean
}

const onMotionsList = computed(() => route.path === '/motions')
const motionsStatus = computed(() =>
  typeof route.query.status === 'string' ? route.query.status : '',
)
const hasAuthorFilter = computed(() => Boolean(route.query.authorId))
const hasWatchedFilter = computed(() => route.query.watched === 'true')

const motionsHeadActive = computed(() => {
  if (route.path === '/motions/new') return false
  if (route.path.startsWith('/moderation')) return true
  return onMotionsList.value
})

const motionsSubLinks = computed<NavLink[]>(() => {
  const links: NavLink[] = [
    {
      id: 'debate',
      label: 'In Beratung',
      icon: 'comments',
      to: { path: '/motions', query: { status: 'debate' } },
      active: onMotionsList.value && motionsStatus.value === 'debate',
    },
    {
      id: 'ballot',
      label: 'In Abstimmung',
      icon: 'check-to-slot',
      to: { path: '/motions', query: { status: 'ballot' } },
      active: onMotionsList.value && motionsStatus.value === 'ballot',
    },
    {
      id: 'decided',
      label: 'Entschlossen',
      icon: 'circle-check',
      to: { path: '/motions', query: { status: 'decided' } },
      active: onMotionsList.value && motionsStatus.value === 'decided',
    },
  ]
  if (isModerator.value) {
    links.push({
      id: 'moderation',
      label: 'Moderation',
      icon: 'shield-halved',
      to: '/moderation',
      active: route.path.startsWith('/moderation'),
    })
  }
  return links
})

const profileSubLinks = computed<NavLink[]>(() => {
  if (!loggedIn.value) return []
  return [
    {
      id: 'mine',
      label: 'Meine Anträge',
      icon: 'seedling',
      to: myMotionsTo.value,
      active:
        onMotionsList.value
        && hasAuthorFilter.value
        && route.query.authorId === user.value?.id,
    },
    {
      id: 'watched',
      label: 'Beobachtete Anträge',
      icon: 'star',
      to: { path: '/motions', query: { watched: 'true' } },
      active: onMotionsList.value && hasWatchedFilter.value,
    },
  ]
})

const motionsAllActive = computed(
  () =>
    onMotionsList.value
    && !motionsStatus.value
    && !hasAuthorFilter.value
    && !hasWatchedFilter.value,
)

const createMotionActive = computed(() => route.path === '/motions/new')

const {
  open: motionsFlyoutOpen,
  pos: motionsFlyoutPos,
  triggerRef: motionsTriggerRef,
  panelRef: motionsPanelRef,
  hide: hideMotionsFlyout,
  reposition: repositionMotionsFlyout,
  onTriggerEnter: onMotionsFlyoutEnter,
  onTriggerLeave: onMotionsFlyoutLeave,
  onPanelEnter: onMotionsFlyoutPanelEnter,
  onPanelLeave: onMotionsFlyoutPanelLeave,
} = useSidebarFlyout('top')

const {
  open: profileFlyoutOpen,
  pos: profileFlyoutPos,
  triggerRef: profileTriggerRef,
  panelRef: profilePanelRef,
  hide: hideProfileFlyout,
  reposition: repositionProfileFlyout,
  onTriggerEnter: onProfileFlyoutEnter,
  onTriggerLeave: onProfileFlyoutLeave,
  onPanelEnter: onProfileFlyoutPanelEnter,
  onPanelLeave: onProfileFlyoutPanelLeave,
} = useSidebarFlyout('bottom')

watch(
  () => route.fullPath,
  () => {
    hideMotionsFlyout()
    hideProfileFlyout()
  },
)

watch(expanded, () => {
  if (motionsFlyoutOpen.value) nextTick(() => repositionMotionsFlyout())
  if (profileFlyoutOpen.value) nextTick(() => repositionProfileFlyout())
})

const isMotionsFlyoutOpen = computed(() => motionsFlyoutOpen.value)
const isProfileFlyoutOpen = computed(() => profileFlyoutOpen.value)
const isSidebarFlyoutOpen = computed(
  () => motionsFlyoutOpen.value || profileFlyoutOpen.value,
)

const motionsFlyoutStyle = computed(() => ({
  top: `${motionsFlyoutPos.value.top}px`,
  left: `${motionsFlyoutPos.value.left}px`,
}))

const profileFlyoutStyle = computed(() => ({
  top: `${profileFlyoutPos.value.top}px`,
  left: `${profileFlyoutPos.value.left}px`,
}))

function setMotionsTriggerRef(el: Element | ComponentPublicInstance | null) {
  motionsTriggerRef.value = el as HTMLElement | null
}

function setMotionsPanelRef(el: Element | ComponentPublicInstance | null) {
  motionsPanelRef.value = el as HTMLElement | null
}

function setProfileTriggerRef(el: Element | ComponentPublicInstance | null) {
  profileTriggerRef.value = el as HTMLElement | null
}

function setProfilePanelRef(el: Element | ComponentPublicInstance | null) {
  profilePanelRef.value = el as HTMLElement | null
}

const scrollRef = ref<HTMLElement | null>(null)
const footSeparated = ref(false)
let scrollResizeObserver: ResizeObserver | null = null

function updateFootSeparation() {
  const el = scrollRef.value
  if (!el) return
  footSeparated.value = el.scrollHeight > Math.ceil(el.clientHeight) + 1
}

function onSidebarScroll() {
  if (motionsFlyoutOpen.value) repositionMotionsFlyout()
  if (profileFlyoutOpen.value) repositionProfileFlyout()
}
</script>

<template>
  <aside
    class="appbar"
    :class="{
      'appbar--expanded': expanded,
      'appbar--flyout-open': isSidebarFlyoutOpen,
      'appbar--scroll-overflow': footSeparated,
    }"
    aria-label="Hauptnavigation"
  >
    <button
      type="button"
      class="appbar__toggle"
      :class="{ 'is-pinned': expanded }"
      :aria-pressed="expanded"
      :aria-label="expanded ? 'Fixierung aufheben' : 'Sidebar fixieren'"
      @click="expanded = !expanded"
    >
      <FontAwesomeIcon icon="thumbtack" class="appbar__toggle-icon" />
    </button>

    <div
      ref="scrollRef"
      class="appbar__scroll"
      @scroll="onSidebarScroll"
    >
      <div class="appbar__head">
        <NuxtLink to="/" class="appbar__brand" aria-label="FreiWerk Startseite">
          <span class="appbar__brand-mark"><FontAwesomeIcon icon="scale-balanced" /></span>
          <span class="appbar__label appbar__brand-name">FreiWerk</span>
        </NuxtLink>
      </div>

      <nav class="appnav" aria-label="Bereiche">
        <div
          :ref="setMotionsTriggerRef"
          class="appnav__group"
          @mouseenter="onMotionsFlyoutEnter"
          @mouseleave="onMotionsFlyoutLeave"
        >
          <NuxtLink
            to="/motions"
            class="appnav__item appnav__item--head"
            :class="{ 'is-active': motionsHeadActive }"
            :aria-current="motionsAllActive ? 'page' : undefined"
            aria-label="Anträge durchsuchen"
            aria-haspopup="true"
            :aria-expanded="isMotionsFlyoutOpen"
          >
            <span class="appnav__icon"><FontAwesomeIcon icon="magnifying-glass" /></span>
            <span class="appbar__label appnav__label">Anträge durchsuchen</span>
          </NuxtLink>
        </div>

        <NuxtLink
          to="/motions/new"
          class="appnav__fab-wrap"
          :class="{ 'is-active': createMotionActive }"
          :aria-current="createMotionActive ? 'page' : undefined"
          aria-label="Antrag erstellen"
        >
          <span class="appnav__fab">
            <FontAwesomeIcon icon="plus" />
          </span>
          <span class="appbar__label appnav__fab-label">Antrag erstellen</span>
        </NuxtLink>
      </nav>

      <ClientOnly>
        <template v-for="group in groups" :key="group.id">
          <div class="appbar__divider" aria-hidden="true" />
          <nav class="appnav" aria-label="Antragsbereiche">
            <template v-for="item in group.items" :key="item.id">
              <NuxtLink
                v-if="item.to"
                :to="item.to"
                class="appnav__item"
                :class="{
                  'is-active': item.active,
                  'appnav__item--panel': item.tone === 'panel',
                  'appnav__item--ballot': item.tone === 'ballot',
                }"
                :aria-current="item.active ? 'page' : undefined"
              >
                <span class="appnav__icon"><FontAwesomeIcon :icon="item.icon" /></span>
                <span class="appbar__label appnav__label">{{ item.label }}</span>
                <span v-if="item.count && item.count > 0" class="appnav__count">{{ item.count }}</span>
              </NuxtLink>
              <button
                v-else
                type="button"
                class="appnav__item"
                :class="{
                  'is-active': item.active,
                  'appnav__item--panel': item.tone === 'panel',
                  'appnav__item--ballot': item.tone === 'ballot',
                }"
                :aria-current="item.active ? 'page' : undefined"
                @click="select(item.id)"
              >
                <span class="appnav__icon"><FontAwesomeIcon :icon="item.icon" /></span>
                <span class="appbar__label appnav__label">{{ item.label }}</span>
                <span v-if="item.count && item.count > 0" class="appnav__count">{{ item.count }}</span>
              </button>
            </template>
          </nav>
        </template>
      </ClientOnly>
    </div>

    <div
      v-if="footSeparated"
      class="appbar__divider appbar__foot-divider"
      aria-hidden="true"
    />

    <div class="appbar__foot">
      <div
        :ref="setProfileTriggerRef"
        class="appnav__group appnav__group--profile"
        @mouseenter="onProfileFlyoutEnter"
        @mouseleave="onProfileFlyoutLeave"
      >
        <NuxtLink
          v-if="loggedIn && user?.id"
          :to="`/users/${user.id}`"
          class="appnav__item appnav__item--head appbar__profile"
          :class="{ 'is-active': route.path === `/users/${user.id}` }"
          :aria-label="`Profil von ${user.displayName}`"
          aria-haspopup="true"
          :aria-expanded="isProfileFlyoutOpen"
        >
          <span class="appbar__avatar">
            <img
              v-if="user.avatarUrl"
              :src="user.avatarUrl"
              alt=""
              class="appbar__avatar-image"
            >
            <FontAwesomeIcon v-else icon="user" />
          </span>
          <span class="appbar__label appnav__label">{{ user.displayName }}</span>
        </NuxtLink>
        <button
          v-else
          type="button"
          class="appnav__item appnav__item--head"
          aria-haspopup="true"
          :aria-expanded="isProfileFlyoutOpen"
          aria-label="Konto"
        >
          <span class="appnav__icon"><FontAwesomeIcon icon="user" /></span>
          <span class="appbar__label appnav__label">Anmelden</span>
        </button>
      </div>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-show="isMotionsFlyoutOpen"
          :ref="setMotionsPanelRef"
          class="appbar-flyout"
          role="menu"
          aria-label="Anträge"
          :style="motionsFlyoutStyle"
          @mouseenter="onMotionsFlyoutPanelEnter"
          @mouseleave="onMotionsFlyoutPanelLeave"
        >
          <NuxtLink
            v-for="link in motionsSubLinks"
            :key="link.id"
            :to="link.to"
            class="appbar-flyout__item"
            :class="{ 'is-active': link.active }"
            role="menuitem"
            :aria-current="link.active ? 'page' : undefined"
            @click="hideMotionsFlyout()"
          >
            <span class="appbar-flyout__icon"><FontAwesomeIcon :icon="link.icon" /></span>
            <span class="appbar-flyout__label">{{ link.label }}</span>
          </NuxtLink>
        </div>

        <div
          v-show="isProfileFlyoutOpen"
          :ref="setProfilePanelRef"
          class="appbar-flyout"
          role="menu"
          aria-label="Konto"
          :style="profileFlyoutStyle"
          @mouseenter="onProfileFlyoutPanelEnter"
          @mouseleave="onProfileFlyoutPanelLeave"
        >
          <NuxtLink
            v-for="link in profileSubLinks"
            :key="link.id"
            :to="link.to"
            class="appbar-flyout__item"
            :class="{ 'is-active': link.active }"
            role="menuitem"
            :aria-current="link.active ? 'page' : undefined"
            @click="hideProfileFlyout()"
          >
            <span class="appbar-flyout__icon"><FontAwesomeIcon :icon="link.icon" /></span>
            <span class="appbar-flyout__label">{{ link.label }}</span>
          </NuxtLink>
          <button
            type="button"
            class="appbar-flyout__item"
            role="menuitem"
            @click="toggleTheme(); hideProfileFlyout()"
          >
            <span class="appbar-flyout__icon">
              <FontAwesomeIcon :icon="isDark ? 'sun' : 'moon'" />
            </span>
            <span class="appbar-flyout__label">{{ isDark ? 'Heller Modus' : 'Dunkler Modus' }}</span>
          </button>
          <button
            v-if="loggedIn"
            type="button"
            class="appbar-flyout__item"
            role="menuitem"
            @click="logout(); hideProfileFlyout()"
          >
            <span class="appbar-flyout__icon"><FontAwesomeIcon icon="right-from-bracket" /></span>
            <span class="appbar-flyout__label">Abmelden</span>
          </button>
          <button
            v-else
            type="button"
            class="appbar-flyout__item"
            role="menuitem"
            @click="openAuthModal('login', route.fullPath); hideProfileFlyout()"
          >
            <span class="appbar-flyout__icon"><FontAwesomeIcon icon="right-to-bracket" /></span>
            <span class="appbar-flyout__label">Anmelden</span>
          </button>
        </div>
      </Teleport>
    </ClientOnly>
  </aside>
</template>

<style scoped>
/* Desktop-only floating icon rail. No panel background — icons hover over the page. */
.appbar {
  display: none;
}

@media (min-width: 768px) {
  .appbar {
    --sidebar-scroll-fade: var(--color-bg);
  }

  .appbar--expanded,
  .appbar--flyout-open,
  .appbar:hover {
    --sidebar-scroll-fade: var(--glass-bg);
  }

  .appbar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    width: var(--rail-collapsed);
    padding: var(--space-4) var(--space-2);
    gap: var(--space-2);
    background: transparent;
    border: none;
    border-right: 1px solid transparent;
    overflow: hidden;
    pointer-events: none;
    transition:
      width 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.25s ease,
      border-color 0.25s ease;
  }

  .appbar--expanded,
  .appbar--flyout-open,
  .appbar:hover {
    width: var(--rail-expanded);
    background: var(--glass-bg);
    border-right-color: var(--glass-border);
    -webkit-backdrop-filter: blur(var(--glass-blur));
    backdrop-filter: blur(var(--glass-blur));
  }
}

.appbar__scroll,
.appbar__foot,
.appbar__toggle {
  pointer-events: auto;
}

.appbar__scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

@media (min-width: 768px) {
  .appbar__scroll {
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .appbar--scroll-overflow .appbar__scroll::after {
    content: '';
    display: block;
    position: sticky;
    bottom: 0;
    width: 100%;
    height: 1.25rem;
    margin-top: -1.25rem;
    flex-shrink: 0;
    pointer-events: none;
    background: linear-gradient(to bottom, transparent, var(--sidebar-scroll-fade));
  }

  .appbar__scroll::-webkit-scrollbar {
    display: none;
  }
}

.appbar__foot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  padding-top: var(--space-1);
}

.appbar__foot-divider {
  flex-shrink: 0;
  pointer-events: none;
  margin: var(--space-1) var(--space-1) 0;
}

@media (min-width: 768px) {
  .appbar--expanded .appbar__scroll,
  .appbar--expanded .appbar__foot,
  .appbar--flyout-open .appbar__scroll,
  .appbar--flyout-open .appbar__foot,
  .appbar:hover .appbar__scroll,
  .appbar:hover .appbar__foot {
    align-items: stretch;
    min-width: calc(var(--rail-expanded) - 2 * var(--space-2));
  }
}

.appbar__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  align-self: flex-start;
  max-width: 100%;
}

@media (min-width: 768px) {
  .appbar--expanded .appbar__head,
  .appbar--flyout-open .appbar__head,
  .appbar:hover .appbar__head {
    align-self: stretch;
    padding-right: 2.5rem;
  }
}

.appbar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 0 1 auto;
  min-width: 0;
  padding: var(--space-1);
  text-decoration: none;
  color: var(--color-text);
  font-weight: 700;
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--color-bg) 80%, transparent));
}

.appbar__brand-mark {
  flex: 0 0 var(--rail-icon-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--rail-icon-size);
  height: var(--rail-icon-size);
  border-radius: var(--radius-sm);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1.35rem;
}

.appbar__toggle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--color-bg) 80%, transparent));
  transition: color 0.18s ease, opacity 0.2s ease, transform 0.18s ease;
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 768px) {
  .appbar__toggle {
    position: absolute;
    top: var(--space-4);
    right: var(--space-2);
    z-index: 2;
  }

  .appbar:hover .appbar__toggle,
  .appbar__toggle:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.appbar__toggle:hover {
  color: var(--color-text);
  transform: scale(1.06);
}

.appbar__toggle-icon {
  transition: transform 0.18s ease, color 0.18s ease;
  transform: rotate(45deg);
}

.appbar__toggle.is-pinned .appbar__toggle-icon {
  transform: rotate(0deg);
  color: var(--color-accent);
}

.appbar__toggle.is-pinned:hover .appbar__toggle-icon {
  color: var(--color-text);
}

/* ---- Nav items ---- */
.appnav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-self: flex-start;
  width: auto;
  max-width: 100%;
}

@media (min-width: 768px) {
  .appbar--expanded .appnav,
  .appbar--flyout-open .appnav,
  .appbar:hover .appnav {
    align-self: stretch;
    width: 100%;
  }
}

.appnav__group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: flex-start;
  width: auto;
  max-width: 100%;
}

.appnav__group:hover,
.appnav__group:focus-within {
  z-index: 4;
}

@media (min-width: 768px) {
  .appbar--expanded .appnav__group,
  .appbar--flyout-open .appnav__group,
  .appbar:hover .appnav__group {
    align-self: stretch;
    width: 100%;
  }
}

.appnav__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: auto;
  max-width: 100%;
  align-self: flex-start;
  padding: var(--space-1);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--color-bg) 80%, transparent));
  transition: color 0.18s ease, transform 0.18s ease, background 0.18s ease;
}

@media (min-width: 768px) {
  .appbar--expanded .appnav__item,
  .appbar--flyout-open .appnav__item,
  .appbar:hover .appnav__item {
    width: 100%;
    align-self: stretch;
    padding: var(--space-1) var(--space-3);
  }
}

.appnav__item:hover:not(.is-active) {
  color: var(--color-accent);
  transform: scale(1.04);
}

/* Collapsed: active tint sits on the icon circle only. */
.appnav__item.is-active {
  color: var(--color-accent);
  background: transparent;
}

.appnav__item.is-active .appnav__icon {
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.appnav__item--panel.is-active {
  color: var(--color-tertiary);
  background: transparent;
}

.appnav__item--panel.is-active .appnav__icon {
  background: color-mix(in srgb, var(--color-tertiary) 20%, transparent);
}

.appnav__item--ballot:not(.is-active) {
  color: var(--color-primary);
}

.appnav__item--ballot.is-active {
  color: var(--color-secondary);
  background: transparent;
}

.appnav__item--ballot.is-active .appnav__icon {
  background: color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.dark .appnav__item--ballot.is-active {
  color: var(--brand-yellow);
}

.dark .appnav__item--ballot.is-active .appnav__icon {
  background: color-mix(in srgb, var(--brand-yellow) 20%, transparent);
}

@media (min-width: 768px) {
  .appbar--expanded .appnav__item.is-active,
  .appbar--flyout-open .appnav__item.is-active,
  .appbar:hover .appnav__item.is-active {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .appbar--expanded .appnav__item.is-active .appnav__icon,
  .appbar--flyout-open .appnav__item.is-active .appnav__icon,
  .appbar:hover .appnav__item.is-active .appnav__icon {
    background: transparent;
  }

  .appbar--expanded .appnav__item--panel.is-active,
  .appbar--flyout-open .appnav__item--panel.is-active,
  .appbar:hover .appnav__item--panel.is-active {
    background: color-mix(in srgb, var(--color-tertiary) 20%, transparent);
  }

  .appbar--expanded .appnav__item--panel.is-active .appnav__icon,
  .appbar--flyout-open .appnav__item--panel.is-active .appnav__icon,
  .appbar:hover .appnav__item--panel.is-active .appnav__icon {
    background: transparent;
  }

  .appbar--expanded .appnav__item--ballot.is-active,
  .appbar--flyout-open .appnav__item--ballot.is-active,
  .appbar:hover .appnav__item--ballot.is-active {
    background: color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .appbar--expanded .appnav__item--ballot.is-active .appnav__icon,
  .appbar--flyout-open .appnav__item--ballot.is-active .appnav__icon,
  .appbar:hover .appnav__item--ballot.is-active .appnav__icon {
    background: transparent;
  }

  .dark .appbar--expanded .appnav__item--ballot.is-active,
  .dark .appbar--flyout-open .appnav__item--ballot.is-active,
  .dark .appbar:hover .appnav__item--ballot.is-active {
    background: color-mix(in srgb, var(--brand-yellow) 20%, transparent);
  }

  .dark .appbar--expanded .appnav__item--ballot.is-active .appnav__icon,
  .dark .appbar--flyout-open .appnav__item--ballot.is-active .appnav__icon,
  .dark .appbar:hover .appnav__item--ballot.is-active .appnav__icon {
    background: transparent;
  }
}

.appnav__icon {
  flex: 0 0 var(--rail-icon-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--rail-icon-size);
  height: var(--rail-icon-size);
  font-size: 1.35rem;
  transition: opacity 0.2s ease, color 0.18s ease;
}

@media (min-width: 768px) {
  /* Collapsed rail at rest: softer icons until hover, flyout, or pin. */
  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appbar__brand-mark {
    opacity: 0.78;
    transition: opacity 0.2s ease;
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item {
    color: var(--color-text-muted);
    filter: none;
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item .appnav__icon,
  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item .appbar__avatar {
    opacity: 0.58;
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item--ballot:not(.is-active) {
    color: color-mix(in srgb, var(--color-primary) 45%, var(--color-text-muted));
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item.is-active {
    color: color-mix(in srgb, var(--color-accent) 72%, var(--color-text-muted));
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item--panel.is-active {
    color: color-mix(in srgb, var(--color-tertiary) 72%, var(--color-text-muted));
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item--ballot.is-active {
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text-muted));
  }

  .dark .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item--ballot.is-active {
    color: color-mix(in srgb, var(--brand-yellow) 70%, var(--color-text-muted));
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item.is-active .appnav__icon,
  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__item.is-active .appbar__avatar {
    opacity: 0.82;
  }

  .appbar:not(.appbar--expanded):not(.appbar--flyout-open):not(:hover) .appnav__fab {
    opacity: 0.72;
    box-shadow:
      0 1px 4px color-mix(in srgb, var(--brand-yellow) 30%, transparent),
      0 1px 2px color-mix(in srgb, var(--color-text) 10%, transparent);
  }
}

.appnav__chevron {
  display: none;
}

/* Yellow FAB row — label appears beside the circle on sidebar hover. */
.appnav__fab-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  align-self: flex-start;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  text-decoration: none;
  filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--color-bg) 80%, transparent));
}

.appnav__fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 var(--rail-fab-size);
  width: var(--rail-fab-size);
  height: var(--rail-fab-size);
  margin-left: calc((var(--rail-icon-size) - var(--rail-fab-size)) / 2);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1.45rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.2s ease;
  box-shadow:
    0 2px 8px color-mix(in srgb, var(--brand-yellow) 45%, transparent),
    0 1px 3px color-mix(in srgb, var(--color-text) 18%, transparent);
}

.appnav__fab-wrap:hover .appnav__fab {
  transform: scale(1.08);
  box-shadow:
    0 4px 14px color-mix(in srgb, var(--brand-yellow) 55%, transparent),
    0 2px 6px color-mix(in srgb, var(--color-text) 22%, transparent);
}

.appnav__fab-wrap.is-active .appnav__fab {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--brand-yellow) 35%, transparent),
    0 2px 8px color-mix(in srgb, var(--brand-yellow) 45%, transparent);
}

.appnav__fab-label {
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.appbar__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transform: translateX(-0.25rem);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.appbar--expanded .appbar__label,
.appbar--flyout-open .appbar__label,
.appbar:hover .appbar__label {
  opacity: 1;
  transform: none;
}

.appnav__count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.45rem;
  margin-inline-start: var(--space-1);
  padding: 0.1rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, currentColor 16%, transparent);
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.appbar--expanded .appnav__count,
.appbar--flyout-open .appnav__count,
.appbar:hover .appnav__count {
  opacity: 1;
}

.appbar__divider {
  height: 1px;
  width: var(--rail-icon-size);
  margin: var(--space-2) var(--space-1);
  background: color-mix(in srgb, var(--color-border) 55%, transparent);
}

@media (min-width: 768px) {
  .appbar--expanded .appbar__divider,
  .appbar--flyout-open .appbar__divider,
  .appbar:hover .appbar__divider {
    width: auto;
    margin: var(--space-2) var(--space-1);
  }
}

/* ---- Footer (profile with flyout submenu) ---- */
.appbar__profile.is-active .appbar__avatar {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.appbar__avatar {
  flex: 0 0 var(--rail-icon-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--rail-icon-size);
  height: var(--rail-icon-size);
  border-radius: var(--radius-pill);
  border: 2px solid var(--brand-yellow);
  background: var(--brand-yellow);
  color: var(--brand-blue);
  font-size: 1.1rem;
  overflow: hidden;
  box-shadow: 0 1px 4px color-mix(in srgb, var(--color-text) 15%, transparent);
  transition: opacity 0.2s ease;
}

.appbar__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .appbar,
  .appbar__label,
  .appbar__toggle,
  .appnav__count,
  .appnav__item,
  .appnav__fab-wrap,
  .appnav__fab {
    transition: none;
  }
}
</style>

<!-- Teleported flyouts: unscoped so body-level panels pick up styles. -->
<style>
@media (min-width: 768px) {
  .appbar-flyout {
    position: fixed;
    z-index: 70;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 9.25rem;
    padding: var(--space-1);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    -webkit-backdrop-filter: blur(var(--glass-blur));
    backdrop-filter: blur(var(--glass-blur));
  }

  .appbar-flyout__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: calc(var(--space-1) + 1px) var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: left;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .appbar-flyout__item:hover:not(.is-active) {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-text);
  }

  .appbar-flyout__item.is-active {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .appbar-flyout__icon {
    flex: 0 0 1.65rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.65rem;
    height: 1.65rem;
    font-size: 0.95rem;
  }

  .appbar-flyout__label {
    flex: 1;
    min-width: 0;
  }
}

@media (min-width: 768px) and (prefers-reduced-motion: reduce) {
  .appbar-flyout__item {
    transition: none;
  }
}
</style>
