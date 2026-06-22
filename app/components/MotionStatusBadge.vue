<script setup lang="ts">
const props = defineProps<{
  status: string
  outcome?: string | null
}>()

const STATUS_TONE: Record<string, 'neutral' | 'primary' | 'tertiary'> = {
  draft: 'neutral',
  debate: 'tertiary',
  ballot: 'primary',
  decided: 'neutral',
}

const showOutcome = computed(
  () => props.status === 'decided' && Boolean(props.outcome),
)

const tone = computed(() => {
  if (showOutcome.value) {
    return props.outcome === 'accepted' ? 'success' : 'danger'
  }
  return STATUS_TONE[props.status] ?? 'neutral'
})

const icon = computed(() => {
  if (showOutcome.value) {
    return props.outcome === 'accepted' ? 'circle-check' : 'circle-xmark'
  }
  return statusIcon(props.status)
})

const label = computed(() => {
  if (showOutcome.value) {
    return outcomeLabel(props.outcome)
  }
  return statusLabel(props.status)
})
</script>

<template>
  <FwBadge :tone="tone">
    <FontAwesomeIcon v-if="icon" :icon="icon" aria-hidden="true" />
    {{ label }}
  </FwBadge>
</template>
