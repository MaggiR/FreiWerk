<script setup lang="ts">
const props = defineProps<{ status: string }>()

const STATUS_TONE: Record<string, 'neutral' | 'primary' | 'tertiary'> = {
  draft: 'neutral',
  debate: 'tertiary',
  ballot: 'primary',
  decided: 'neutral',
}

const tone = computed(() => STATUS_TONE[props.status] ?? 'neutral')

const icon = computed(() => statusIcon(props.status))
const label = computed(() => statusLabel(props.status))
</script>

<template>
  <FwBadge :tone="tone">
    <FontAwesomeIcon v-if="icon" :icon="icon" aria-hidden="true" />
    {{ label }}
  </FwBadge>
</template>
