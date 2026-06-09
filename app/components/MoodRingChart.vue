<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import {
  MOOD_POLL_CHOICES,
  MOOD_LABELS,
  moodColorsForScheme,
  type MoodPollChoice,
} from '../../shared/constants'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  totals: Record<MoodPollChoice, number>
  totalVotes: number
}>()

const colorMode = useColorMode()
const moodColors = computed(() =>
  moodColorsForScheme(colorMode.value === 'dark' ? 'dark' : 'light'),
)
const legendColor = computed(() =>
  colorMode.value === 'dark' ? '#eef2fb' : '#0f1b33',
)

const chartData = computed(() => ({
  labels: MOOD_POLL_CHOICES.map((c) => MOOD_LABELS[c]),
  datasets: [
    {
      data: MOOD_POLL_CHOICES.map((c) => props.totals[c]),
      backgroundColor: MOOD_POLL_CHOICES.map((c) => moodColors.value[c]),
      borderWidth: 0,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: legendColor.value, padding: 14 },
    },
  },
}))
</script>

<template>
  <div class="ring">
    <Doughnut :data="chartData" :options="chartOptions" />
    <div class="ring__center" aria-hidden="true">
      <span class="ring__center-value">{{ totalVotes }}</span>
      <span class="ring__center-label">Stimmen</span>
    </div>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  height: 260px;
}

.ring__center {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
  line-height: 1.2;
}

.ring__center-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
}

.ring__center-label {
  margin-top: var(--space-1);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
