<script setup lang="ts">
import type { LinkPreview } from '#shared/linkPreview'

defineProps<{
  preview: LinkPreview | null
  loading?: boolean
}>()

const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div v-if="loading || preview" class="link-preview-card">
    <button
      type="button"
      class="link-preview-card__dismiss"
      aria-label="Linkvorschau entfernen"
      @click="emit('dismiss')"
    >
      <FontAwesomeIcon icon="xmark" />
    </button>

    <div v-if="loading && !preview" class="link-preview-card__loading">
      Linkvorschau wird geladen …
    </div>

    <a
      v-else-if="preview"
      :href="preview.url"
      class="link-preview-card__link"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <img
        v-if="preview.imageUrl"
        class="link-preview-card__image"
        :src="preview.imageUrl"
        alt=""
      >
      <div class="link-preview-card__content">
        <span v-if="preview.siteName" class="link-preview-card__site">{{ preview.siteName }}</span>
        <span v-if="preview.title" class="link-preview-card__title">{{ preview.title }}</span>
        <span v-if="preview.description" class="link-preview-card__description">
          {{ preview.description }}
        </span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.link-preview-card {
  position: relative;
  margin: 0 var(--space-3) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  overflow: hidden;
}
.link-preview-card__dismiss {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-bg) 85%, transparent);
  color: var(--color-text-muted);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.link-preview-card__dismiss:hover {
  color: var(--color-text);
  background: var(--color-bg);
}
.link-preview-card__loading {
  padding: var(--space-3);
  font-size: 0.82rem;
  color: var(--color-text-muted);
}
.link-preview-card__link {
  display: block;
  color: inherit;
  text-decoration: none;
}
.link-preview-card__link:hover .link-preview-card__title {
  text-decoration: underline;
}
.link-preview-card__image {
  display: block;
  width: 100%;
  max-height: 10rem;
  object-fit: cover;
  background: var(--color-bg);
}
.link-preview-card__content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: var(--space-2) var(--space-3);
}
.link-preview-card__site {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-text-muted);
}
.link-preview-card__title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-preview-card__description {
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
