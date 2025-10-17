<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'
import services from '@/services/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { logEvent } from '@/services/analyticsService'
import { enqueue, flush } from '@/services/offlineQueue'

/* process queued tasks for habits */
async function flushQueue() {
  await flush(async (task) => {
    if (task.name === 'habit_sync') {
      await services.syncHabitTask(task.payload)
    }
  })
}
/* when back online, sync then reload data */
function onOnline() {
  flushQueue()
  loadRange()
}

/*  listen auth; Offline sync on mount */
onMounted(() => {
  window.addEventListener('online', onOnline)

  onAuthStateChanged(getAuth(), (u) => {
    uid.value = u?.uid || 'guest'
    loadRange()
  })

  // first time also try flush to clear leftovers
  flushQueue()
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
})

/*  keep current uid and refresh on change */
const uid = ref(null)
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, (user) => {
    uid.value = user ? user.uid : null
    // refresh when login state changes
    loadRange()
  })
})

/*  today string to cap date inputs */
const fmt = (d) => new Date(d).toISOString().slice(0, 10)
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const todayStr = fmt(new Date())

/*add new habit entries */
const form = ref({
  date: new Date().toISOString().slice(0, 10),
  type: 'Walk',
  minutes: 30,
  note: '',
})

/*  custom date range for the table */
const weekStart = ref(fmt(new Date()))
const weekEnd = ref(fmt(new Date()))

watch(weekStart, (val) => {
  if (new Date(weekEnd.value) < new Date(val)) weekEnd.value = val
})
watch(weekEnd, (val) => {
  const end = new Date(val)
  const start = new Date(weekStart.value)
  const today = new Date(todayStr)
  if (end > today) {
    weekEnd.value = todayStr
    return
  }
  if (end < start) {
    weekEnd.value = weekStart.value
  }
})

/*  rows in current range from storage */
const rows = ref([])

async function loadRange() {
  if (!uid.value) return
  rows.value = await services.getHabitEntries({ from: '0000-01-01', to: '9999-12-31' }, uid.value)
}

watch([weekStart, weekEnd], loadRange)

/*  basic checks;Offline :show immediately, sync later */
async function addEntry() {
  if (!form.value.date || !form.value.type || !form.value.minutes) return
  const item = await services.addHabitEntry({ ...form.value }, uid.value)
  // insert at top; pending when offline
  rows.value = [item, ...rows.value]
  // reset form
  form.value = { date: new Date().toISOString().slice(0, 10), type: 'Walk', minutes: 30, note: '' }
}

/*  total minutes and per-type breakdown */
const totalMinutes = computed(() => rows.value.reduce((s, r) => s + (Number(r.minutes) || 0), 0))
const byType = computed(() => {
  const m = {}
  rows.value.forEach((r) => {
    m[r.type] = (m[r.type] || 0) + (Number(r.minutes) || 0)
  })
  return Object.entries(m).map(([type, minutes]) => ({ type, minutes }))
})

/*sort/filter/pagination state */
const sortBy = ref(localStorage.getItem('trk_sortBy') || 'date')
const sortDir = ref(localStorage.getItem('trk_sortDir') || 'desc')
const pageSize = 10
const page = ref(Number(localStorage.getItem('trk_page') || 1))

const colFilters = reactive({
  from: '',
  to: '',
  type: '',
  minMin: '',
  maxMin: '',
  note: '',
})
const typeOptions = computed(() => Array.from(new Set(rows.value.map((r) => r.type))).sort())
const norm = (s) => (s ?? '').toString().trim().toLowerCase()

/* apply filters then sort */
const filteredSorted = computed(() => {
  const from = colFilters.from ? new Date(colFilters.from) : null
  const to = colFilters.to ? new Date(colFilters.to) : null
  const fType = norm(colFilters.type)
  const minM = colFilters.minMin === '' ? null : Number(colFilters.minMin)
  const maxM = colFilters.maxMin === '' ? null : Number(colFilters.maxMin)
  const fNote = norm(colFilters.note)

  let data = rows.value.filter((r) => {
    const d = new Date(r.date)
    const minutes = Number(r.minutes) || 0
    const okFrom = !from || d >= from
    const okTo = !to || d <= to
    const okType = !fType || norm(r.type) === fType
    const okMin = minM === null || minutes >= minM
    const okMax = maxM === null || minutes <= maxM
    const okNote = !fNote || norm(r.note).includes(fNote)
    return okFrom && okTo && okType && okMin && okMax && okNote
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  data = [...data].sort((a, b) => {
    let A, B
    if (sortBy.value === 'date') {
      A = new Date(a.date).getTime()
      B = new Date(b.date).getTime()
    } else if (sortBy.value === 'minutes') {
      A = Number(a.minutes) || 0
      B = Number(b.minutes) || 0
    } else {
      A = norm(a[sortBy.value])
      B = norm(b[sortBy.value])
    }
    if (A < B) return -1 * dir
    if (A > B) return 1 * dir
    return 0
  })
  return data
})

/* totals and page slice */
const total = computed(() => filteredSorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const paged = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * pageSize
  return filteredSorted.value.slice(start, start + pageSize)
})

/*sorting and pagination actions */
function changeSort(field) {
  if (sortBy.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
  page.value = 1
}
function goto(p) {
  if (p >= 1 && p <= totalPages.value) page.value = p
}
function goFirstPage() {
  page.value = 1
}

/* remember sort and page in localStorage */
watch([sortBy, sortDir, page], () => {
  localStorage.setItem('trk_sortBy', sortBy.value)
  localStorage.setItem('trk_sortDir', sortDir.value)
  localStorage.setItem('trk_page', String(page.value))
})

/* build rows for CSV/PDF from filtered data or selected subset */
const selectedIds = ref([])
const exportHeaders = ['Date', 'Type', 'Minutes', 'Note']
const exportRows = computed(() => {
  const src = selectedIds.value.length
    ? filteredSorted.value.filter((r) => selectedIds.value.includes(r.id))
    : filteredSorted.value
  return src.map((r) => [r.date, r.type, r.minutes, r.note || ''])
})
function onExportCSV() {
  exportCSV('habit_range', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF(
    'habit_range',
    `Habit Activity (${weekStart.value} ~ ${weekEnd.value})`,
    exportHeaders,
    exportRows.value,
  )
}

/*  initial load */
onMounted(loadRange)
</script>

<template>
  <div class="container mt-5">
    <!-- tracker intro with quick tips -->
    <h1 class="mb-3">Habit Tracker</h1>
    <div class="alert alert-info mb-3" role="region" aria-label="How to use habit tracker">
      <strong>Log your daily activity</strong>
      <ul class="mb-0 mt-2">
        <li>
          Pick a date, choose a type (e.g., Walk/Run) and enter minutes, then click <em>Add</em>.
        </li>
        <li>
          Use the range filters to see totals in a time window. You can sort or export your data.
        </li>
        <li>Tip: keep entries short and consistent—small steps add up.</li>
      </ul>
    </div>

    <!--add new habit entry -->
    <div class="card mb-3 p-3">
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label">Date</label>
          <input type="date" v-model="form.date" class="form-control" :max="todayStr" />
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
      <div class="mt-2"><button class="btn btn-primary" @click="addEntry">Add</button></div>
    </div>

    <!--Toolbar : custom range, selection helpers, export, sort -->
    <div class="d-flex align-items-center gap-2 mb-2">
      <label class="form-label mb-0 me-2">Start</label>
      <input
        type="date"
        v-model="weekStart"
        class="form-control"
        style="max-width: 180px"
        :max="todayStr"
      />
      <span class="mx-1">to</span>
      <input
        type="date"
        v-model="weekEnd"
        class="form-control"
        style="max-width: 180px"
        :max="todayStr"
      />

      <small class="text-muted ms-auto"
        >Selected: {{ selectedIds.length }} / {{ paged.length }}</small
      >

      <div class="btn-group">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="selectedIds = paged.map((r) => r.id)"
        >
          Select all
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="selectedIds = []">Clear</button>
      </div>

      <div class="btn-group">
        <!-- Export — CSV and PDF -->
        <button class="btn btn-outline-secondary" @click="onExportCSV">Export CSV</button>
        <button class="btn btn-outline-secondary" @click="onExportPDF">Export PDF</button>
      </div>

      <!-- ort buttons for date/type/minutes -->
      <div class="btn-group" role="group" aria-label="Sort">
        <button
          class="btn btn-outline-secondary"
          :aria-pressed="sortBy === 'date'"
          @click="changeSort('date')"
        >
          Date <small v-if="sortBy === 'date'">({{ sortDir }})</small>
        </button>
        <button
          class="btn btn-outline-secondary"
          :aria-pressed="sortBy === 'type'"
          @click="changeSort('type')"
        >
          Type <small v-if="sortBy === 'type'">({{ sortDir }})</small>
        </button>
        <button
          class="btn btn-outline-secondary"
          :aria-pressed="sortBy === 'minutes'"
          @click="changeSort('minutes')"
        >
          Minutes <small v-if="sortBy === 'minutes'">({{ sortDir }})</small>
        </button>
      </div>
    </div>

    <!-- show total minutes and per-type totals in badges -->
    <div class="alert alert-info py-2">
      <strong>Total minutes in range:</strong> {{ totalMinutes }}.
      <span v-for="x in byType" :key="x.type" class="badge bg-secondary ms-2"
        >{{ x.type }}: {{ x.minutes }}</span
      >
    </div>

    <!-- sortable, filterable, paginated -->
    <div class="table-responsive">
      <table class="table align-middle" aria-describedby="tracker-caption">
        <caption id="tracker-caption" class="visually-hidden">
          Sortable, paginated habit records table with individual column filters (second header
          row).
        </caption>

        <thead>
          <tr>
            <th scope="col" style="width: 36px">Select</th>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Minutes</th>
            <th scope="col">Note</th>
          </tr>

          <!--Per-column filter row -->
          <tr>
            <th></th>
            <th class="d-flex gap-1">
              <label class="visually-hidden" for="f-from">From</label>
              <input
                id="f-from"
                type="date"
                class="form-control form-control-sm"
                v-model="colFilters.from"
                @change="goFirstPage"
              />
              <label class="visually-hidden" for="f-to">To</label>
              <input
                id="f-to"
                type="date"
                class="form-control form-control-sm"
                v-model="colFilters.to"
                @change="goFirstPage"
              />
            </th>

            <th>
              <label class="visually-hidden" for="f-type">Filter type</label>
              <select
                id="f-type"
                class="form-select form-select-sm"
                v-model="colFilters.type"
                @change="goFirstPage"
              >
                <option value="">All types</option>
                <option v-for="opt in typeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </th>

            <th class="d-flex gap-1">
              <label class="visually-hidden" for="f-min">Min</label>
              <input
                id="f-min"
                type="number"
                min="0"
                class="form-control form-control-sm"
                v-model.number="colFilters.minMin"
                @input="goFirstPage"
                placeholder="min"
              />
              <label class="visually-hidden" for="f-max">Max</label>
              <input
                id="f-max"
                type="number"
                min="0"
                class="form-control form-control-sm"
                v-model.number="colFilters.maxMin"
                @input="goFirstPage"
                placeholder="max"
              />
            </th>

            <th>
              <label class="visually-hidden" for="f-note">Filter note</label>
              <input
                id="f-note"
                class="form-control form-control-sm"
                v-model.trim="colFilters.note"
                placeholder="Filter note"
                @input="goFirstPage"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- checkbox selection works with export -->
          <tr v-for="r in paged" :key="r.id">
            <td>
              <input type="checkbox" class="form-check-input" :value="r.id" v-model="selectedIds" />
            </td>
            <td>{{ r.date }}</td>
            <td>{{ r.type }}</td>
            <td>{{ r.minutes }}</td>
            <td>{{ r.note }}</td>
          </tr>
          <tr v-if="paged.length === 0">
            <td colspan="5" class="text-center text-muted">No data in this range.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination controls -->
    <nav class="d-flex justify-content-between align-items-center" aria-label="Pagination">
      <span class="text-muted">Total {{ total }} • Page {{ page }} of {{ totalPages }}</span>
      <div class="btn-group">
        <button class="btn btn-outline-secondary" :disabled="page === 1" @click="goto(page - 1)">
          Prev
        </button>
        <button
          class="btn btn-outline-secondary"
          :disabled="page === totalPages"
          @click="goto(page + 1)"
        >
          Next
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}
</style>
