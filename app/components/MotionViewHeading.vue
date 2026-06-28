<script setup lang="ts">
import { MOTION_VIEW_META, type MotionViewId } from '#shared/constants'

const props = defineProps<{
  view: MotionViewId
}>()

const meta = computed(() => MOTION_VIEW_META[props.view])
</script>

<template>
  <h2
    class="motion-view-heading"
    :class="{ 'motion-view-heading--ballot': view === 'ballot' }"
  >
    <FontAwesomeIcon :icon="meta.icon" />
    {{ meta.label }}
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
.motion-view-heading--ballot {
  color: color-mix(in srgb, var(--color-secondary) 88%, var(--color-text));
}
.motion-view-heading--ballot svg {
  color: color-mix(in srgb, var(--color-secondary) 75%, var(--color-primary));
}
.dark .motion-view-heading--ballot {
  color: var(--color-text);
}
.dark .motion-view-heading--ballot svg {
  color: var(--color-primary);
}
</style>
