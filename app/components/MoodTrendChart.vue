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
} from '#shared/constants'

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

const labels = computed(() => {
  const dayCounts = new Map<string, number>()
  return props.trend.map((p) => {
    const date = new Date(p.t)
    const dayKey = date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    })
    const index = dayCounts.get(dayKey) ?? 0
    dayCounts.set(dayKey, index + 1)
    if (index === 0) return dayKey
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  })
})

function pollTotal(point: TrendPoint): number {
  return MOOD_POLL_CHOICES.reduce((sum, choice) => sum + point[choice], 0)
}

function toPercent(point: TrendPoint, choice: MoodPollChoice): number {
  const total = pollTotal(point)
  if (total === 0) return 0
  return (point[choice] / total) * 100
}

const chartData = computed(() => ({
  labels: labels.value,
  datasets: MOOD_POLL_CHOICES.map((choice, index) => ({
    label: MOOD_LABELS[choice],
    data: props.trend.map((p) => toPercent(p, choice)),
    borderColor: moodColors.value[choice],
    backgroundColor: hexToRgba(moodColors.value[choice], fillAlpha.value),
    fill: index === 0 ? 'origin' : '-1',
    stack: 'mood',
    tension: 0,
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
      max: 100,
      ticks: {
        color: axisColor.value,
        precision: 0,
        callback: (value) => `${value}%`,
      },
      grid: { color: gridColor.value },
    },
  },
  plugins: {
    legend: { position: 'bottom', labels: { color: axisColor.value, padding: 14 } },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed.y ?? 0
          return `${context.dataset.label}: ${value.toFixed(1)} %`
        },
      },
    },
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
