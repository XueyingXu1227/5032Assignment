<template>
  <div class="d-flex gap-2 mb-3">
    <button class="btn btn-outline-primary" @click="setDays(7)">Last 7 days</button>
    <button class="btn btn-outline-primary" @click="setDays(30)">Last 30 days</button>
  </div>

  <div class="card p-3 mb-4">
    <h5 class="mb-2">Daily Activity</h5>
    <Line :data="lineData" :options="lineOptions" />
  </div>

  <div class="card p-3">
    <h5 class="mb-2">Top Resources</h5>
    <Bar :data="barData" :options="barOptions" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDailySeries, getResourceTop } from '@/services/analyticsService'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
} from 'chart.js'
Chart.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
)

const days = ref(7)
const lineData = ref({ labels: [], datasets: [] })
const barData = ref({ labels: [], datasets: [] })
const lineOptions = ref({ responsive: true, plugins: { legend: { position: 'bottom' } } })
const barOptions = ref({ responsive: true, plugins: { legend: { display: false } } })

async function load() {
  const series = await getDailySeries(days.value)
  lineData.value = {
    labels: series.map((x) => x.date),
    datasets: [
      { label: 'Habit Updates', data: series.map((x) => x.habit_update || 0) },
      { label: 'Resource Clicks', data: series.map((x) => x.resource_click || 0) },
      { label: 'Meal Plans', data: series.map((x) => x.mealplan_generate || 0) },
    ],
  }
  const top = await getResourceTop(days.value, 5)
  barData.value = { labels: top.map((x) => x.slug), datasets: [{ data: top.map((x) => x.count) }] }
}

function setDays(n) {
  days.value = n
  load()
}

onMounted(load)
</script>
