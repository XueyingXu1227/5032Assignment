<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'
import services from '@/services/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { logEvent } from '@/services/analyticsService'
import { enqueue, flush } from '@/services/offlineQueue'

// —— 离线任务 flush（保留你的实现）
async function flushQueue() {
  await flush(async (task) => {
    if (task.name === 'habit_update') {
      await logEvent('habit_update')
    }
  })
}
function onOnline() {
  flushQueue()
}
onMounted(() => {
  window.addEventListener('online', onOnline)
  flushQueue()
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
})

// 登录用户
const uid = ref(null)
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, (user) => {
    uid.value = user ? user.uid : null
    loadRange() // 登录状态变化时刷新数据源
  })
})

// today
const fmt = (d) => new Date(d).toISOString().slice(0, 10)
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const todayStr = fmt(new Date())

// 表单
const form = ref({
  date: todayStr,
  type: 'Walk',
  minutes: 30,
  note: '',
})

// 选择的日期范围
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

// 当前范围内的数据（直接从 services 按范围拉取）
const rows = ref([])

async function loadRange() {
  rows.value = await services.getHabitEntries(
    { from: weekStart.value, to: weekEnd.value },
    uid.value,
  )
}

watch([weekStart, weekEnd], loadRange)

// 新增
async function addEntry() {
  if (
    !form.value.date ||
    !form.value.type ||
    form.value.minutes === '' ||
    form.value.minutes == null
  )
    return
  if (new Date(form.value.date) > new Date(todayStr)) {
    alert('Date cannot be in the future.')
    return
  }
  const entry = {
    id: crypto.randomUUID(),
    date: form.value.date,
    type: form.value.type,
    minutes: Number(form.value.minutes),
    note: form.value.note || '',
  }

  try {
    await services.saveHabitEntry(entry, uid.value)
    form.value.note = ''
    // 自动扩展范围以包含新日期
    const d = new Date(entry.date)
    const s0 = new Date(weekStart.value)
    const e0 = new Date(weekEnd.value)
    if (d < s0) weekStart.value = fmt(d)
    if (d > e0) weekEnd.value = fmt(d)
    await loadRange()

    if (navigator.onLine) {
      await logEvent('habit_update')
    } else {
      enqueue('habit_update', { when: Date.now() })
    }
  } catch (e) {
    enqueue('habit_update', { when: Date.now() })
  }
}

// 汇总
const totalMinutes = computed(() => rows.value.reduce((s, r) => s + (Number(r.minutes) || 0), 0))
const byType = computed(() => {
  const m = {}
  rows.value.forEach((r) => {
    m[r.type] = (m[r.type] || 0) + (Number(r.minutes) || 0)
  })
  return Object.entries(m).map(([type, minutes]) => ({ type, minutes }))
})

// —— 交互式表格（排序/过滤/分页：沿用实现）
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

const total = computed(() => filteredSorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const paged = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * pageSize
  return filteredSorted.value.slice(start, start + pageSize)
})

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

watch([sortBy, sortDir, page], () => {
  localStorage.setItem('trk_sortBy', sortBy.value)
  localStorage.setItem('trk_sortDir', sortDir.value)
  localStorage.setItem('trk_page', String(page.value))
})

// 导出
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

onMounted(loadRange)
</script>

<template>
  <div class="container mt-5">
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

    <!-- input -->
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

    <!-- Custom Date Range + Toolbar -->
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
        <button class="btn btn-outline-secondary" @click="onExportCSV">Export CSV</button>
        <button class="btn btn-outline-secondary" @click="onExportPDF">Export PDF</button>
      </div>

      <!-- Sort buttons -->
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

    <div class="alert alert-info py-2">
      <strong>Total minutes in range:</strong> {{ totalMinutes }}.
      <span v-for="x in byType" :key="x.type" class="badge bg-secondary ms-2"
        >{{ x.type }}: {{ x.minutes }}</span
      >
    </div>

    <!-- interactive table -->
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

          <!-- Column Filter Rows -->
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

    <!-- Pagination -->
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
