<template>
  <div class="container py-3">
    <h1 class="mb-3">Analytics</h1>

    <TableCard title="Daily Activity">
      <template #actions>
        <div class="btn-group btn-group-sm" role="group" aria-label="Select range">
          <button
            class="btn btn-outline-primary"
            :class="{ active: days === 7 }"
            @click="setDays(7)"
          >
            Last 7 days
          </button>
          <button
            class="btn btn-outline-primary"
            :class="{ active: days === 30 }"
            @click="setDays(30)"
          >
            Last 30 days
          </button>
        </div>
      </template>

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
    </TableCard>

    <TableCard :title="`Events by Type (last ${days} days)`">
      <div role="img" :aria-label="`Event types distribution for last ${days} days.`">
        <Bar :data="barData" :options="barOptions" />
      </div>

      <div class="table-responsive mt-3">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Type</th>
              <th class="text-end">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in typeRows" :key="row.type">
              <td>
                <code>{{ row.type }}</code>
              </td>
              <td class="text-end">{{ row.count }}</td>
            </tr>
            <tr v-if="!typeRows.length">
              <td colspan="2" class="text-center text-muted py-3">No data</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table class="visually-hidden">
        <caption>
          Events by type
        </caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in typeRows" :key="row.type">
            <th scope="row">{{ row.type }}</th>
            <td>{{ row.count }}</td>
          </tr>
        </tbody>
      </table>
    </TableCard>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import TableCard from '@/components/TableCard.vue'
import { getDailySeries } from '@/services/analyticsService'
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
const seriesData = ref([])

const lineOptions = ref({
  responsive: true,
  plugins: { legend: { position: 'bottom' } },
  scales: { y: { beginAtZero: true } },
})

const barOptions = ref({
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
})

const lineTable = computed(() =>
  (lineData.value.labels || []).map((d, i) => ({
    date: d,
    total: (lineData.value.datasets || []).reduce((s, ds) => s + (ds.data[i] || 0), 0),
  })),
)
const peak = computed(() =>
  lineTable.value.reduce((m, r) => (r.total > m.total ? r : m), { total: -1 }),
)
const peakDate = computed(() => peak.value?.date || 'N/A')
const peakValue = computed(() => peak.value?.total || 0)

const typeRows = computed(() => {
  const totals = { habit_update: 0, resource_click: 0, mealplan_generate: 0 }
  for (const r of seriesData.value) {
    totals.habit_update += r.habit_update || 0
    totals.resource_click += r.resource_click || 0
    totals.mealplan_generate += r.mealplan_generate || 0
  }
  return [
    { type: 'resource_click', count: totals.resource_click },
    { type: 'habit_update', count: totals.habit_update },
    { type: 'mealplan_generate', count: totals.mealplan_generate },
  ].filter((x) => x.count > 0 || seriesData.value.length)
})

async function load() {
  const series = await getDailySeries(days.value)
  seriesData.value = series

  lineData.value = {
    labels: series.map((x) => x.date),
    datasets: [
      {
        label: 'Habit Updates',
        data: series.map((x) => x.habit_update || 0),
        tension: 0.35,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66,165,245,0.2)',
        borderWidth: 2,
      },
      {
        label: 'Resource Clicks',
        data: series.map((x) => x.resource_click || 0),
        tension: 0.35,
        borderColor: '#66BB6A',
        backgroundColor: 'rgba(102,187,106,0.2)',
        borderWidth: 2,
      },
      {
        label: 'Meal Plans',
        data: series.map((x) => x.mealplan_generate || 0),
        tension: 0.35,
        borderColor: '#FFA726',
        backgroundColor: 'rgba(255,167,38,0.2)',
        borderWidth: 2,
      },
    ],
  }
  const labels = typeRows.value.map((x) => x.type)
  const values = typeRows.value.map((x) => x.count)
  barData.value = { labels, datasets: [{ data: values }] }
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
