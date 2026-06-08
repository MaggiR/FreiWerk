<script setup lang="ts">
const props = defineProps<{
  motionId: string
  watched: boolean
}>()

const emit = defineEmits<{
  changed: [watched: boolean]
}>()

const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const watched = ref(props.watched)
const pending = ref(false)

watch(
  () => props.watched,
  (value) => {
    watched.value = value
  },
)

async function toggle() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }

  pending.value = true
  const wasWatched = watched.value
  try {
    await $fetch(`/api/motions/${props.motionId}/watch`, {
      method: wasWatched ? 'DELETE' : 'PUT',
    })
    watched.value = !wasWatched
    emit('changed', watched.value)
  } catch (err: unknown) {
    if (!isUnauthorized(err)) {
      // Silent fail on cards — detail page has fuller error handling.
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="motion-watch-star"
    :class="{ 'motion-watch-star--active': watched }"
    :disabled="pending"
    :aria-pressed="watched"
    :aria-label="watched ? 'Beobachtung beenden' : 'Antrag beobachten'"
    :title="watched ? 'Beobachtung beenden' : 'Antrag beobachten'"
    @click.stop.prevent="toggle"
  >
    <FontAwesomeIcon :icon="watched ? 'star' : 'star-half-stroke'" />
  </button>
</template>

<style scoped>
.motion-watch-star {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease,
    transform 0.12s ease;
}

.motion-watch-star :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}

.motion-watch-star:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--color-text);
  background: var(--color-bg);
}

.motion-watch-star--active {
  background: var(--brand-yellow);
  border-color: var(--brand-yellow);
  color: var(--brand-blue);
}

.motion-watch-star--active:hover:not(:disabled) {
  background: var(--brand-yellow);
  color: var(--brand-blue);
}

.motion-watch-star:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
