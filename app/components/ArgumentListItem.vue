<script setup lang="ts">
import type { ArgumentItem } from '#shared/types'
import {
  ARGUMENT_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
} from '#shared/constants'

withDefaults(
  defineProps<{
    argument: ArgumentItem
    canModerate?: boolean
  }>(),
  { canModerate: false },
)

defineEmits<{
  moderate: [payload: { status?: 'accepted' | 'rejected'; deliberationStatus?: 'open' | 'confirmed' | 'refuted' }]
}>()

function deliberationTone(status: string): 'primary' | 'neutral' {
  return status === 'confirmed' ? 'primary' : 'neutral'
}
</script>

<template>
  <article
    class="arg"
    :class="[`arg--${argument.stance}`, { 'arg--pending': argument.status !== 'accepted' }]"
    data-deliberation-type="argument"
    :data-deliberation-id="argument.id"
  >
    <div class="arg__votes">
      <UpvoteButton
        target-type="argument"
        :target-id="argument.id"
        :count="argument.upvoteCount"
        :upvoted="argument.upvotedByMe"
        layout="stacked"
        context-label="Argument"
      />
    </div>

    <div class="arg__content">
      <div class="arg__head">
        <h4 class="arg__title">{{ argument.title }}</h4>
        <span
          v-if="argument.status === 'proposed'"
          class="arg__status arg__status--proposed"
        >
          <FontAwesomeIcon icon="hourglass-end" />
          {{ PROPOSAL_STATUS_LABELS.proposed }}
        </span>
        <span
          v-else-if="argument.status === 'rejected'"
          class="arg__status arg__status--rejected"
        >
          <FontAwesomeIcon icon="circle-xmark" />
          {{ PROPOSAL_STATUS_LABELS.rejected }}
        </span>
        <FwBadge
          v-else-if="argument.deliberationStatus !== 'open'"
          :tone="deliberationTone(argument.deliberationStatus)"
        >
          {{ ARGUMENT_STATUS_LABELS[argument.deliberationStatus] }}
        </FwBadge>
      </div>

      <div class="arg__body">
        <RichText :html="argument.bodyHtml" />
      </div>

      <div class="arg__foot">
        <NuxtLink
          v-if="argument.authorId"
          :to="`/users/${argument.authorId}`"
          class="arg__author-link"
        >
          <FontAwesomeIcon icon="user" />
          <span>{{ argument.authorName ?? 'Unbekannt' }}</span>
        </NuxtLink>
        <span v-else class="arg__author-link">
          <FontAwesomeIcon icon="user" />
          <span>{{ argument.authorName ?? 'Unbekannt' }}</span>
        </span>
      </div>

      <div v-if="canModerate" class="arg__mod">
        <template v-if="argument.status === 'proposed'">
          <button
            type="button"
            class="arg__mod-btn arg__mod-btn--accept"
            @click="$emit('moderate', { status: 'accepted' })"
          >
            <FontAwesomeIcon icon="check" /> Annehmen
          </button>
          <button
            type="button"
            class="arg__mod-btn arg__mod-btn--reject"
            @click="$emit('moderate', { status: 'rejected' })"
          >
            <FontAwesomeIcon icon="xmark" /> Ablehnen
          </button>
        </template>
        <template v-else-if="argument.status === 'accepted'">
          <span class="arg__mod-label">Status:</span>
          <button
            v-for="opt in ['open', 'confirmed', 'refuted'] as const"
            :key="opt"
            type="button"
            class="arg__mod-status"
            :class="{ 'is-active': argument.deliberationStatus === opt }"
            @click="$emit('moderate', { deliberationStatus: opt })"
          >
            {{ ARGUMENT_STATUS_LABELS[opt] }}
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="arg__mod-btn arg__mod-btn--accept"
            @click="$emit('moderate', { status: 'accepted' })"
          >
            <FontAwesomeIcon icon="check" /> Doch annehmen
          </button>
        </template>
      </div>
    </div>
  </article>
</template>

<style scoped>
.arg {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  min-width: 0;
  max-width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  hyphens: auto;
  -webkit-hyphens: auto;
}
.arg--pro {
  border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
  background: color-mix(in srgb, var(--color-success) 10%, var(--color-surface));
}
.arg--con {
  border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
}
.arg--pro.arg--pending {
  border-color: color-mix(in srgb, var(--color-success) 55%, var(--color-border));
}
.arg--con.arg--pending {
  border-color: color-mix(in srgb, var(--color-danger) 55%, var(--color-border));
}
.arg__votes {
  flex-shrink: 0;
  width: 2.75rem;
  display: flex;
  justify-content: center;
}
.arg__content {
  flex: 1;
  min-width: 0;
}
.arg__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
  margin-bottom: var(--space-2);
}
.arg__title {
  margin: 0;
  min-width: 0;
  font-size: 0.98rem;
  font-weight: 700;
  overflow-wrap: break-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}
.arg__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
}
.arg__status svg {
  font-size: 0.68rem;
}
.arg__status--rejected {
  color: var(--color-danger);
}
.arg__body {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  hyphens: auto;
  -webkit-hyphens: auto;
}
.arg__body :deep(.rich-text) {
  max-width: 100%;
  overflow-wrap: break-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}
.arg__body :deep(.rich-text > :first-child) {
  margin-top: 0;
}
.arg__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  margin-top: var(--space-3);
}
.arg__author-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
  overflow-wrap: break-word;
}
a.arg__author-link:hover {
  color: var(--color-accent);
}
.arg__mod {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.arg__mod-label {
  flex: 1 1 100%;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}
.arg__mod-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 100%;
  padding: 0.2rem var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.arg__mod-btn--accept:hover {
  border-color: var(--color-success);
  color: var(--color-success);
}
.arg__mod-btn--reject:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.arg__mod-status {
  max-width: 100%;
  padding: 0.15rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  overflow-wrap: anywhere;
  text-align: center;
}
.arg__mod-status.is-active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg));
  color: var(--color-accent);
}
</style>
