<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeSeriesScale,
  CategoryScale,
  Filler,
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

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeSeriesScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
)

type TrendPoint = { t: string } & Record<MoodPollChoice, number>

const props = defineProps<{ trend: TrendPoint[] }>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const moodColors = computed(() =>
  moodColorsForScheme(isDark.value ? 'dark' : 'light'),
)
const fillAlpha = computed(() => (isDark.value ? 0.55 : 0.72))
const axisColor = computed(() =>
  isDark.value ? '#9aa7c2' : '#5b6678',
)
const gridColor = computed(() =>
  colorMode.value === 'dark' ? 'rgba(120,150,200,0.15)' : 'rgba(3,45,103,0.08)',
)

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const labels = computed(() =>
  props.trend.map((p) =>
    new Date(p.t).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }),
  ),
)

const chartData = computed(() => ({
  labels: labels.value,
  datasets: MOOD_POLL_CHOICES.map((choice, index) => ({
    label: MOOD_LABELS[choice],
    data: props.trend.map((p) => p[choice]),
    borderColor: moodColors.value[choice],
    backgroundColor: hexToRgba(moodColors.value[choice], fillAlpha.value),
    fill: index === 0 ? 'origin' : '-1',
    stack: 'mood',
    tension: 0.3,
    pointRadius: 0,
  })),
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: {
      stacked: true,
      ticks: { color: axisColor.value },
      grid: { color: gridColor.value },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { color: axisColor.value, precision: 0 },
      grid: { color: gridColor.value },
    },
  },
  plugins: {
    legend: { position: 'bottom', labels: { color: axisColor.value, padding: 14 } },
  },
}))
</script>

<template>
  <div class="trend">
    <Line v-if="trend.length > 0" :data="chartData" :options="chartOptions" />
    <p v-else class="trend__empty">Noch keine Daten für den Verlauf.</p>
  </div>
</template>

<style scoped>
.trend {
  position: relative;
  height: 260px;
}
.trend__empty {
  color: var(--color-text-muted);
}
</style>
