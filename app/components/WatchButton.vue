<script setup lang="ts">
const props = defineProps<{
  motionId: string
  watched: boolean
  watchCount: number
}>()

const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const watched = ref(props.watched)
const count = ref(props.watchCount)
const pending = ref(false)
const error = ref('')

watch(
  () => [props.watched, props.watchCount] as const,
  ([w, c]) => {
    watched.value = w
    count.value = c
  },
)

async function toggle() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  error.value = ''
  pending.value = true
  const wasWatched = watched.value
  try {
    const res = await $fetch<{ watched: boolean; watchCount: number }>(
      `/api/motions/${props.motionId}/watch`,
      { method: wasWatched ? 'DELETE' : 'PUT' },
    )
    watched.value = res.watched
    count.value = res.watchCount
  } catch (err: unknown) {
    if (isUnauthorized(err)) return
    error.value = extractError(err, 'Aktion fehlgeschlagen.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <FwButton
    :variant="watched ? 'secondary' : 'ghost'"
    :disabled="pending"
    :aria-pressed="watched"
    :title="error || (watched ? 'Beobachtung beenden' : 'Antrag beobachten')"
    @click="toggle"
  >
    <FontAwesomeIcon :icon="watched ? 'star' : 'star-half-stroke'" />
    {{ watched ? 'Beobachtet' : 'Beobachten' }}
    <span
      v-if="count > 0"
      class="watch__count"
      :class="{ 'watch__count--active': watched }"
    >{{ count }}</span>
  </FwButton>
</template>

<style scoped>
.watch__count {
  margin-left: var(--space-1);
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.watch__count--active {
  background: rgba(255, 255, 255, 0.28);
  color: var(--color-accent-contrast);
}
</style>
