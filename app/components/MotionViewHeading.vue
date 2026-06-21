<script setup lang="ts">
import { MOTION_VIEW_META, type MotionViewId } from '#shared/constants'

const props = defineProps<{
  view: MotionViewId
  /** Optional item count shown next to the heading (e.g. number of questions). */
  count?: number
}>()

const meta = computed(() => MOTION_VIEW_META[props.view])
</script>

<template>
  <h2 class="motion-view-heading">
    <FontAwesomeIcon :icon="meta.icon" />
    {{ meta.label }}
    <span v-if="count != null" class="motion-view-heading__count">{{ count }}</span>
  </h2>
</template>

<style scoped>
.motion-view-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text);
}
.motion-view-heading svg {
  flex-shrink: 0;
  color: currentColor;
}
.motion-view-heading__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
