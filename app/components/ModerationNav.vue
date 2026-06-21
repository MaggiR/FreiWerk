<script setup lang="ts">
const links = [
  { to: '/moderation', label: 'Meldungen', icon: 'flag' },
  { to: '/moderation/users', label: 'Sperren', icon: 'user-slash' },
  { to: '/moderation/log', label: 'Protokoll', icon: 'clipboard-list' },
]
</script>

<template>
  <nav class="mod-nav" aria-label="Moderation">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="mod-nav__link"
      exact-active-class="mod-nav__link--active"
    >
      <FontAwesomeIcon :icon="link.icon" />
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.mod-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.mod-nav__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.mod-nav__link:hover {
  background: var(--color-bg);
}
.mod-nav__link--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-contrast);
}
</style>
