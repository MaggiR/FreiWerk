<script setup lang="ts">
import { splitRelativeTimeDisplay } from '~/utils/chatDates'

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

const display = computed(() =>
  splitRelativeTimeDisplay(props.value, now.value, props.prefix),
)
</script>

<template>
  <span v-if="display.prefix" class="relative-time">
    <span class="relative-time__prefix">{{ display.prefix }}</span>
    <time
      class="relative-time__hint"
      :datetime="display.datetime"
      :title="display.exact"
    >
      {{ display.relative }}
    </time>
  </span>
  <time
    v-else
    class="relative-time relative-time__hint"
    :datetime="display.datetime"
    :title="display.exact"
  >
    {{ display.relative }}
  </time>
</template>

<style scoped>
.relative-time {
  display: inline;
}
.relative-time__hint:hover {
  color: var(--color-accent);
}
</style>
