<script setup>
import { ref, computed, onMounted } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'

// ---- Simple data model (use localStorage first; it's easy to connect to Firestore/service later) ----
const LS_KEY = 'habits'
const form = ref({
  date: new Date().toISOString().slice(0, 10),
  type: 'Walk',
  minutes: 30,
  note: '',
})
const list = ref([])

function load() {
  list.value = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(list.value))
}

function addEntry() {
  if (!form.value.date || !form.value.type || !form.value.minutes) return
  list.value.push({
    id: crypto.randomUUID(),
    ...form.value,
    minutes: Number(form.value.minutes),
  })
  save()
  form.value.note = ''
}

function startOfWeek(d) {
  const dt = new Date(d)
  const day = dt.getDay() || 7
  if (day !== 1) dt.setDate(dt.getDate() - (day - 1))
  dt.setHours(0, 0, 0, 0)
  return dt
}
function endOfWeek(d) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 7)
  return e
}
const weekStart = ref(startOfWeek(new Date()).toISOString().slice(0, 10))
const weekEnd = computed(() => {
  const e = endOfWeek(new Date(weekStart.value))
  return e.toISOString().slice(0, 10)
})

// Filtering this week's data
const weekly = computed(() => {
  const s = new Date(weekStart.value)
  const e = endOfWeek(weekStart.value)
  return list.value.filter((r) => {
    const d = new Date(r.date)
    return d >= s && d < e
  })
})

// brief summary
const totalMinutes = computed(() =>
  weekly.value.reduce((sum, r) => sum + (Number(r.minutes) || 0), 0),
)
const byType = computed(() => {
  const m = {}
  weekly.value.forEach((r) => {
    m[r.type] = (m[r.type] || 0) + (Number(r.minutes) || 0)
  })
  return Object.entries(m).map(([type, minutes]) => ({ type, minutes }))
})

// ---- export ----
const selectedIds = ref([])
const exportHeaders = ['Date', 'Type', 'Minutes', 'Note']
const exportRows = computed(() => {
  const src = selectedIds.value.length
    ? weekly.value.filter((r) => selectedIds.value.includes(r.id))
    : weekly.value
  return src.map((r) => [r.date, r.type, r.minutes, r.note || ''])
})
function onExportCSV() {
  exportCSV('habit_weekly', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF(
    'habit_weekly',
    `Habit Weekly Report (${weekStart.value} ~ ${weekEnd.value})`,
    exportHeaders,
    exportRows.value,
  )
}

onMounted(load)
</script>

<template>
  <div class="container mt-5">
    <h2 class="mb-3">Habit Tracker (Weekly)</h2>

    <!-- input area -->
    <div class="card mb-3 p-3">
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label">Date</label>
          <input type="date" v-model="form.date" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Type</label>
          <select v-model="form.type" class="form-select">
            <option>Walk</option>
            <option>Run</option>
            <option>Gym</option>
            <option>Yoga</option>
            <option>Water</option>
            <option>Sleep</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Minutes</label>
          <input type="number" v-model.number="form.minutes" min="0" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Note</label>
          <input type="text" v-model="form.note" class="form-control" placeholder="optional" />
        </div>
      </div>
      <div class="mt-2">
        <button class="btn btn-primary" @click="addEntry">Add</button>
      </div>
    </div>

    <!-- Weekly Selection + Export -->
    <div class="d-flex align-items-center gap-2 mb-2">
      <label class="form-label mb-0 me-2">Week start</label>
      <input type="date" v-model="weekStart" class="form-control" style="max-width: 180px" />
      <small class="text-muted">to {{ weekEnd }}</small>

      <small class="text-muted ms-auto"
        >Selected: {{ selectedIds.length }} / {{ weekly.length }}</small
      >
      <div class="btn-group">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="selectedIds = weekly.map((r) => r.id)"
        >
          Select all
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="selectedIds = []">Clear</button>
      </div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary" @click="onExportCSV">Export CSV</button>
        <button class="btn btn-outline-secondary" @click="onExportPDF">Export PDF</button>
      </div>
    </div>

    <!-- 汇总 -->
    <div class="alert alert-info py-2">
      <strong>Total minutes this week:</strong> {{ totalMinutes }}.
      <span v-for="x in byType" :key="x.type" class="badge bg-secondary ms-2">
        {{ x.type }}: {{ x.minutes }}
      </span>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="width: 36px">Sel</th>
          <th>Date</th>
          <th>Type</th>
          <th>Minutes</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in weekly" :key="r.id">
          <td>
            <input type="checkbox" class="form-check-input" :value="r.id" v-model="selectedIds" />
          </td>
          <td>{{ r.date }}</td>
          <td>{{ r.type }}</td>
          <td>{{ r.minutes }}</td>
          <td>{{ r.note }}</td>
        </tr>
        <tr v-if="weekly.length === 0">
          <td colspan="5" class="text-center text-muted">No data this week.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
