<script setup lang="ts">
import { formatExactDateTime, formatRelativeTime, toIsoTimestamp } from '~/utils/chatDates'

const props = defineProps<{
  value: string | Date
  /** Optional German prefix, e.g. "Veröffentlicht" → "Veröffentlicht vor 2 Std." */
  prefix?: string
}>()

const now = ref(new Date())

let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickTimer = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

const label = computed(() => {
  const relative = formatRelativeTime(props.value, now.value)
  const trimmedPrefix = props.prefix?.trim()
  if (!trimmedPrefix) return relative
  if (relative === 'gerade eben') return `${trimmedPrefix} gerade eben`
  return `${trimmedPrefix} ${relative}`
})
const exact = computed(() => formatExactDateTime(props.value))
const datetime = computed(() => toIsoTimestamp(props.value))
</script>

<template>
  <time
    class="relative-time"
    :datetime="datetime"
    :title="exact"
  >
    {{ label }}
  </time>
</template>

<style scoped>
.relative-time {
  cursor: help;
  text-decoration: none;
}
</style>
