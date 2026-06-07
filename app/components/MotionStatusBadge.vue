<script setup lang="ts">
const props = defineProps<{ status: string }>()

const tone = computed(() =>
  props.status === 'debate' ? 'secondary' : 'neutral',
)

const icon = computed(() => statusIcon(props.status))
const label = computed(() => statusLabel(props.status))
</script>

<template>
  <FwBadge :tone="tone">
    <FontAwesomeIcon v-if="icon" :icon="icon" aria-hidden="true" />
    {{ label }}
  </FwBadge>
</template>
