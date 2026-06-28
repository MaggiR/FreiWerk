<script setup lang="ts">
import type { ResourceItem } from '#shared/types'
import { PROPOSAL_STATUS_LABELS } from '#shared/constants'
import { resourceDisplayTitle, resourceFileExtension } from '~/utils/resources'

const props = withDefaults(
  defineProps<{
    resource: ResourceItem
    canModerate?: boolean
  }>(),
  { canModerate: false },
)

defineEmits<{ moderate: [status: 'accepted' | 'rejected'] }>()

const fileExtension = computed(() =>
  resourceFileExtension(props.resource.title, props.resource.url, props.resource.kind),
)
const displayTitle = computed(() =>
  resourceDisplayTitle(props.resource.title, fileExtension.value),
)
</script>

<template>
  <li
    class="res__item"
    :class="{ 'res__item--pending': resource.status !== 'accepted' }"
    data-deliberation-type="resource"
    :data-deliberation-id="resource.id"
  >
    <div class="res__votes">
      <UpvoteButton
        class="res__upvote"
        target-type="resource"
        :target-id="resource.id"
        :count="resource.upvoteCount"
        :upvoted="resource.upvotedByMe"
        layout="stacked"
        context-label="Ressource"
      />
    </div>

    <div class="res__body">
      <div class="res__title-row">
        <FontAwesomeIcon
          :icon="resource.kind === 'file' ? 'file-lines' : 'link'"
          class="res__type-icon"
          aria-hidden="true"
        />
        <span class="res__title">{{ displayTitle }}</span>
        <FwBadge
          v-if="fileExtension"
          class="res__ext-chip"
          tone="neutral"
        >
          {{ fileExtension!.toUpperCase() }}
        </FwBadge>
      </div>
      <p v-if="resource.description" class="res__desc">{{ resource.description }}</p>
      <div class="res__meta">
        <NuxtLink
          v-if="resource.authorId"
          :to="`/users/${resource.authorId}`"
          class="res__meta-item res__author-link"
        >
          <FontAwesomeIcon icon="user" />
          <span>{{ resource.authorName ?? 'Unbekannt' }}</span>
        </NuxtLink>
        <span v-else class="res__meta-item res__author-link">
          <FontAwesomeIcon icon="user" />
          <span>{{ resource.authorName ?? 'Unbekannt' }}</span>
        </span>
        <span class="res__meta-sep" aria-hidden="true">·</span>
        <span class="res__meta-item res__date">
          Hinzugefügt <RelativeTime :value="resource.createdAt" />
        </span>
        <template v-if="resource.status !== 'accepted'">
          <span class="res__meta-sep" aria-hidden="true">·</span>
          <span
            class="res__meta-item res__status"
            :class="{ 'res__status--rejected': resource.status === 'rejected' }"
          >
            <FontAwesomeIcon
              :icon="resource.status === 'rejected' ? 'circle-xmark' : 'hourglass-end'"
            />
            {{ PROPOSAL_STATUS_LABELS[resource.status] }}
          </span>
        </template>
      </div>
      <div v-if="canModerate && resource.status === 'proposed'" class="res__mod">
        <button
          type="button"
          class="res__mod-btn res__mod-btn--accept"
          @click="$emit('moderate', 'accepted')"
        >
          <FontAwesomeIcon icon="check" /> Annehmen
        </button>
        <button
          type="button"
          class="res__mod-btn res__mod-btn--reject"
          @click="$emit('moderate', 'rejected')"
        >
          <FontAwesomeIcon icon="xmark" /> Ablehnen
        </button>
      </div>
    </div>

    <a
      :href="resource.url"
      class="res__action"
      :aria-label="resource.kind === 'file' ? 'Herunterladen' : 'Link öffnen'"
      :download="resource.kind === 'file' ? displayTitle : undefined"
      :target="resource.kind === 'link' ? '_blank' : undefined"
      :rel="resource.kind === 'link' ? 'noopener noreferrer' : undefined"
    >
      <FontAwesomeIcon
        class="res__action-icon"
        :icon="resource.kind === 'file' ? 'download' : 'up-right-from-square'"
      />
    </a>
  </li>
</template>

<style scoped>
.res__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.res__item--pending {
  border-style: dashed;
}
.res__votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2.75rem;
}
.res__upvote {
  flex-shrink: 0;
}
.res__body {
  flex: 1;
  min-width: 0;
}
.res__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.res__type-icon {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-tertiary);
}
.res__title {
  font-weight: 700;
  color: var(--color-text);
  overflow-wrap: break-word;
}
.res__ext-chip {
  flex-shrink: 0;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}
.res__desc {
  margin: var(--space-1) 0 0;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  overflow-wrap: break-word;
}
.res__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.res__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.res__meta-sep {
  user-select: none;
}
.res__author-link {
  color: inherit;
  text-decoration: none;
}
a.res__author-link:hover {
  color: var(--color-accent);
}
.res__status {
  font-size: 0.72rem;
  font-weight: 600;
}
.res__status svg {
  font-size: 0.68rem;
}
.res__status--rejected {
  color: var(--color-danger);
}
.res__action {
  flex-shrink: 0;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid color-mix(in srgb, var(--color-tertiary) 35%, var(--color-border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-tertiary) 10%, var(--color-bg));
  color: var(--color-tertiary);
  text-decoration: none;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}
.res__action-icon {
  font-size: 1.45rem;
  line-height: 1;
}
.res__action:hover {
  border-color: color-mix(in srgb, var(--color-tertiary) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-tertiary) 18%, var(--color-bg));
  color: var(--color-tertiary);
}
.res__mod {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.res__mod-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.2rem var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.res__mod-btn--accept:hover {
  border-color: var(--color-success);
  color: var(--color-success);
}
.res__mod-btn--reject:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
@container res (max-width: 559px) {
  .res__item {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .res__votes {
    width: auto;
  }
  .res__body {
    flex: 1 1 calc(100% - 3.5rem);
    min-width: min(100%, 12rem);
  }
  .res__action {
    margin-left: auto;
    width: 2.75rem;
    height: 2.75rem;
  }
  .res__action-icon {
    font-size: 1.2rem;
  }
}
</style>
