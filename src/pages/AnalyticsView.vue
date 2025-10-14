<template>
  <h1 class="mb-3">Analytics</h1>

  <div class="d-flex gap-2 mb-3">
    <button class="btn btn-outline-primary" @click="setDays(7)">Last 7 days</button>
    <button class="btn btn-outline-primary" @click="setDays(30)">Last 30 days</button>
  </div>

  <div class="card p-3 mb-4">
    <h2 class="h5 mb-2">Daily Activity</h2>
    <div
      role="img"
      :aria-label="`Activity for last ${days} days. Peak at ${peakDate} with ${peakValue}.`"
    >
      <Line :data="lineData" :options="lineOptions" />
    </div>

    <table class="visually-hidden">
      <caption>
        Daily activity data
      </caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Total events</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in lineTable" :key="r.date">
          <th scope="row">{{ r.date }}</th>
          <td>{{ r.total }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card p-3">
    <h2 class="h5 mb-2">Top Resources</h2>
    <div role="img" aria-label="Top clicked resources in the selected period.">
      <Bar :data="barData" :options="barOptions" />
    </div>

    <table class="visually-hidden">
      <caption>
        Top resources
      </caption>
      <thead>
        <tr>
          <th scope="col">Slug</th>
          <th scope="col">Clicks</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(slug, i) in barData.labels" :key="slug">
          <th scope="row">{{ slug }}</th>
          <td>{{ barData.datasets[0].data[i] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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

const lineTable = computed(() =>
  (lineData.value.labels || []).map((d, i) => ({
    date: d,
    total: lineData.value.datasets?.reduce((s, ds) => s + (ds.data[i] || 0), 0) || 0,
  })),
)
const peak = computed(() =>
  lineTable.value.reduce((m, r) => (r.total > m.total ? r : m), { total: -1 }),
)
const peakDate = computed(() => peak.value?.date || 'N/A')
const peakValue = computed(() => peak.value?.total || 0)

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
<style scoped>
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
}
</style>
