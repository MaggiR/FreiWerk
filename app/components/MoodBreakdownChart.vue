<script setup lang="ts">
import {
  MOOD_POLL_CHOICES,
  MOOD_LABELS,
  moodColorsForScheme,
  type MoodPollChoice,
} from '../../shared/constants'

const props = defineProps<{
  totals: Record<MoodPollChoice, number>
  totalVotes: number
}>()

const colorMode = useColorMode()
const moodColors = computed(() =>
  moodColorsForScheme(colorMode.value === 'dark' ? 'dark' : 'light'),
)

const rows = computed(() =>
  MOOD_POLL_CHOICES.map((choice) => {
    const count = props.totals[choice]
    const percent = approvalRatio(count, props.totalVotes)
    return {
      choice,
      label: MOOD_LABELS[choice],
      count,
      percent,
      color: moodColors.value[choice],
    }
  }),
)
</script>

<template>
  <div class="breakdown">
    <div v-for="row in rows" :key="row.choice" class="breakdown__row">
      <span class="breakdown__label">{{ row.label }}</span>
      <div class="breakdown__detail">
        <span class="breakdown__meta">
          <span class="breakdown__count">{{ row.count }}</span>
          <span class="breakdown__percent">{{ row.percent }}%</span>
        </span>
        <div class="breakdown__track" aria-hidden="true">
          <span
            class="breakdown__fill"
            :style="{ width: `${row.percent}%`, backgroundColor: row.color }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-height: 260px;
  justify-content: center;
}

.breakdown__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.breakdown__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.breakdown__detail {
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  align-items: center;
  gap: var(--space-3);
}

.breakdown__meta {
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--space-2);
  font-variant-numeric: tabular-nums;
}

.breakdown__count {
  font-weight: 700;
}

.breakdown__percent {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.breakdown__track {
  height: 0.75rem;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.breakdown__fill {
  display: block;
  height: 100%;
  min-width: 0;
  border-radius: var(--radius-pill);
  transition: width 0.25s ease;
}
</style>
