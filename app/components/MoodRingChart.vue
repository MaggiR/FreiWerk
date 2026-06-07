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
  MOOD_COLORS,
  type MoodPollChoice,
} from '../../shared/constants'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  totals: Record<MoodPollChoice, number>
}>()

const colorMode = useColorMode()
const legendColor = computed(() =>
  colorMode.value === 'dark' ? '#eef2fb' : '#0f1b33',
)

const chartData = computed(() => ({
  labels: MOOD_POLL_CHOICES.map((c) => MOOD_LABELS[c]),
  datasets: [
    {
      data: MOOD_POLL_CHOICES.map((c) => props.totals[c]),
      backgroundColor: MOOD_POLL_CHOICES.map((c) => MOOD_COLORS[c]),
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
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  height: 260px;
}
</style>
