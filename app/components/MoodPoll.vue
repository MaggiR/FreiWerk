<script setup lang="ts">
import { MOOD_POLL_CHOICES, MOOD_LABELS, type MoodPollChoice } from '../../shared/constants'

defineProps<{
  current: MoodPollChoice | null
  disabled?: boolean
}>()

const emit = defineEmits<{ vote: [choice: MoodPollChoice] }>()

const ICONS: Record<MoodPollChoice, string> = {
  approve: 'thumbs-up',
  reject: 'thumbs-down',
  abstain: 'circle-half-stroke',
}
</script>

<template>
  <div class="poll">
    <button
      v-for="choice in MOOD_POLL_CHOICES"
      :key="choice"
      type="button"
      class="poll__btn"
      :class="[`poll__btn--${choice}`, { 'is-active': current === choice }]"
      :disabled="disabled"
      @click="emit('vote', choice)"
    >
      <FontAwesomeIcon :icon="ICONS[choice]" />
      <span>{{ MOOD_LABELS[choice] }}</span>
    </button>
  </div>
</template>

<style scoped>
.poll {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}
.poll__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.2s ease, background 0.2s ease;
}
.poll__btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.poll__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.poll__btn :deep(svg) {
  font-size: 1.4rem;
}
.poll__btn.is-active {
  color: #fff;
}
.poll__btn--approve.is-active {
  background: var(--mood-approve);
  border-color: var(--mood-approve);
}
.poll__btn--reject.is-active {
  background: var(--mood-reject);
  border-color: var(--mood-reject);
}
.poll__btn--abstain.is-active {
  background: var(--mood-abstain);
  border-color: var(--mood-abstain);
}
</style>
