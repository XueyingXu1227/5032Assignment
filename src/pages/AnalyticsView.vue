<template>
  <!-- BR (F.1)：Interactive Charts — daily activity line chart with quick range buttons -->
  <div class="container py-3">
    <h1 class="mb-3">Analytics</h1>

    <!-- user can switch 7/30 days; chart updates -->
    <!-- BR (E.3)：Accessibility — buttons have aria group label -->
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
      <!-- line chart for total daily events -->
      <!-- aria label describes peak day and value -->
      <div
        role="img"
        :aria-label="`Activity for last ${days} days. Peak at ${peakDate} with ${peakValue}.`"
      >
        <Line :data="lineData" :options="lineOptions" />
      </div>

      <!-- Accessibility : hidden data table for screen readers -->
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

    <!-- bar chart shows event types in the selected range -->
    <!-- BR (B.2)：Dynamic Data - values come from computed totals based on series data -->
    <TableCard :title="`Events by Type (last ${days} days)`">
      <div role="img" :aria-label="`Event types distribution for last ${days} days.`">
        <Bar :data="barData" :options="barOptions" />
      </div>
      <!-- simple table view of type counts -->
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

      <!--hidden table mirrors bar chart data -->
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
// register chart.js parts used by Line/Bar
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
// default range is last 7 days
const days = ref(7)
// Dynamic Data — reactive chart datase
const lineData = ref({ labels: [], datasets: [] })
const barData = ref({ labels: [], datasets: [] })
const seriesData = ref([])
// chart options kept simple; legend at bottom
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
//build a table version of the line chart data
const lineTable = computed(() =>
  (lineData.value.labels || []).map((d, i) => ({
    date: d,
    total: (lineData.value.datasets || []).reduce((s, ds) => s + (ds.data[i] || 0), 0),
  })),
)
//find peak day to describe in aria label
const peak = computed(() =>
  lineTable.value.reduce((m, r) => (r.total > m.total ? r : m), { total: -1 }),
)
const peakDate = computed(() => peak.value?.date || 'N/A')
const peakValue = computed(() => peak.value?.total || 0)
//group totals by event type for the bar chart and table
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
//load series and build both charts
async function load() {
  //fetch series for the selected range
  const series = await getDailySeries(days.value)
  seriesData.value = series
  //Build line chart dataset
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
  //Build bar chart dataset from computed rows
  const labels = typeRows.value.map((x) => x.type)
  const values = typeRows.value.map((x) => x.count)
  barData.value = { labels, datasets: [{ data: values }] }
}
//update range and reload charts
function setDays(n) {
  days.value = n
  load()
}
//load initial charts on page open
onMounted(load)
</script>

<style scoped>
/* visually hide but keep content for screen readers */
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
