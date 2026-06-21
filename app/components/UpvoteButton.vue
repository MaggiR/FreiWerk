<script setup lang="ts">
// Generic, contextless upvote (no downvotes). Self-contained: toggles the current
// user's upvote on any deliberation element and keeps an optimistic local count.
type UpvoteTargetType = 'argument' | 'question' | 'answer' | 'resource' | 'post'

const props = withDefaults(
  defineProps<{
    targetType: UpvoteTargetType
    targetId: string
    count?: number
    upvoted?: boolean
    size?: 'sm' | 'md'
    /** Inline pill (default) or icon above count. */
    layout?: 'inline' | 'stacked'
    /** Optional contextual hint shown as the accessible label, e.g. "Argument". */
    contextLabel?: string
  }>(),
  { count: 0, upvoted: false, size: 'md', layout: 'inline', contextLabel: '' },
)

const emit = defineEmits<{ change: [{ upvoted: boolean; count: number }] }>()

const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const localCount = ref(props.count)
const localUpvoted = ref(props.upvoted)
const pending = ref(false)

watch(() => props.count, (value) => (localCount.value = value))
watch(() => props.upvoted, (value) => (localUpvoted.value = value))

const ariaLabel = computed(() => {
  const base = localUpvoted.value ? 'Upvote zurücknehmen' : 'Hochstimmen'
  return props.contextLabel ? `${base} (${props.contextLabel})` : base
})

async function toggle() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  if (pending.value) return
  pending.value = true

  const prevCount = localCount.value
  const prevUpvoted = localUpvoted.value
  localUpvoted.value = !prevUpvoted
  localCount.value = prevCount + (localUpvoted.value ? 1 : -1)

  try {
    const res = await $fetch('/api/upvotes', {
      method: 'POST',
      body: { targetType: props.targetType, targetId: props.targetId },
    })
    localUpvoted.value = res.upvoted
    localCount.value = res.count
    emit('change', { upvoted: res.upvoted, count: res.count })
  } catch {
    localUpvoted.value = prevUpvoted
    localCount.value = prevCount
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="upvote"
    :class="{
      'upvote--active': localUpvoted,
      'upvote--stacked': layout === 'stacked',
      [`upvote--${size}`]: true,
    }"
    :aria-pressed="localUpvoted"
    :aria-label="ariaLabel"
    :disabled="pending"
    @click.stop="toggle"
  >
    <FontAwesomeIcon icon="thumbs-up" class="upvote__icon" />
    <span class="upvote__count">{{ localCount }}</span>
  </button>
</template>

<style scoped>
.upvote {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.upvote--sm {
  padding: 0.1rem 0.45rem;
  font-size: 0.78rem;
}
.upvote--md {
  font-size: 0.85rem;
}
.upvote--stacked {
  flex-direction: column;
  gap: 0.15rem;
  padding: var(--space-2) 0.4rem;
  border-radius: var(--radius-md);
  min-width: 2.5rem;
}
.upvote--stacked .upvote__icon {
  font-size: 1.2rem;
  line-height: 1;
}
.upvote--stacked.upvote--sm {
  padding: 0.35rem 0.3rem;
  min-width: 2.25rem;
}
.upvote--stacked.upvote--sm .upvote__icon {
  font-size: 1.05rem;
}
.upvote--stacked .upvote__count {
  font-size: 0.78rem;
  line-height: 1;
}
.upvote:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.upvote--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg));
}
.upvote:disabled {
  cursor: default;
  opacity: 0.7;
}
.upvote__count {
  font-weight: 600;
}
</style>
