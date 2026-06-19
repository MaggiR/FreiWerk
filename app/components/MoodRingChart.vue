<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipModel,
} from 'chart.js'
import {
  MOOD_POLL_CHOICES,
  MOOD_LABELS,
  moodColorsForScheme,
  type MoodPollChoice,
} from '#shared/constants'
import { approvalRatio, formatCompactCount } from '~/utils/format'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  totals: Record<MoodPollChoice, number>
  totalVotes: number
}>()

type HoveredSegment = {
  label: string
  count: number
  percent: number
  color: string
}

const colorMode = useColorMode()
const moodColors = computed(() =>
  moodColorsForScheme(colorMode.value === 'dark' ? 'dark' : 'light'),
)
const legendColor = computed(() =>
  colorMode.value === 'dark' ? '#eef2fb' : '#0f1b33',
)

const hoveredSegment = ref<HoveredSegment | null>(null)

const chartData = computed(() => ({
  labels: MOOD_POLL_CHOICES.map((c) => MOOD_LABELS[c]),
  datasets: [
    {
      data: MOOD_POLL_CHOICES.map((c) => props.totals[c]),
      backgroundColor: MOOD_POLL_CHOICES.map((c) => moodColors.value[c]),
      borderWidth: 0,
      hoverBorderWidth: 0,
    },
  ],
}))

function externalTooltipHandler(context: {
  chart: ChartJS
  tooltip: TooltipModel<'doughnut'>
}) {
  const { tooltip } = context
  if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
    hoveredSegment.value = null
    return
  }

  const index = tooltip.dataPoints[0]!.dataIndex
  const choice = MOOD_POLL_CHOICES[index]
  if (!choice) {
    hoveredSegment.value = null
    return
  }

  const count = props.totals[choice]
  hoveredSegment.value = {
    label: MOOD_LABELS[choice],
    count,
    percent: approvalRatio(count, props.totalVotes),
    color: moodColors.value[choice],
  }
}

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: legendColor.value, padding: 14 },
    },
    tooltip: {
      enabled: false,
      external: externalTooltipHandler,
    },
  },
}))
</script>

<template>
  <div class="ring">
    <Doughnut :data="chartData" :options="chartOptions" />

    <span class="ring__center-value">{{ formatCompactCount(totalVotes) }}</span>

    <span v-show="!hoveredSegment" class="ring__center-label" aria-hidden="true">
      Stimmen
    </span>

    <Transition name="ring-popover">
      <div
        v-if="hoveredSegment"
        class="ring__popover"
        role="status"
        aria-live="polite"
        :aria-label="`${hoveredSegment.label}: ${hoveredSegment.count} Stimmen, ${hoveredSegment.percent} Prozent`"
      >
        <div class="ring__popover-head">
          <span
            class="ring__popover-swatch"
            :style="{ backgroundColor: hoveredSegment.color }"
            aria-hidden="true"
          />
          <span class="ring__popover-label">{{ hoveredSegment.label }}</span>
        </div>
        <p class="ring__popover-stats">
          <span class="ring__popover-count">{{ formatCompactCount(hoveredSegment.count) }}</span>
          <span class="ring__popover-percent">{{ hoveredSegment.percent }} %</span>
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  height: 260px;
}

.ring__center-value {
  position: absolute;
  top: 40%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
  line-height: 1;
  pointer-events: none;
}

.ring__center-label {
  position: absolute;
  top: calc(40% + 1.35rem);
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.2;
  pointer-events: none;
}

.ring__popover {
  position: absolute;
  top: calc(40% + 1.35rem);
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  width: min(11rem, 42%);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}

.ring__popover-head {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.ring__popover-swatch {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.ring__popover-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.ring__popover-stats {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-2);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.ring__popover-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
}

.ring__popover-percent {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.ring-popover-enter-active,
.ring-popover-leave-active {
  transition: opacity 0.16s ease;
}

.ring-popover-enter-from,
.ring-popover-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ring-popover-enter-active,
  .ring-popover-leave-active {
    transition: none;
  }
}
</style>
