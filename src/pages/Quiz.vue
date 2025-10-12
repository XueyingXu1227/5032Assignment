<script setup>
import { ref, computed, onMounted } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'

const LS_KEY = 'quizAttempts'

// Simple "Record a test result" form
const form = ref({
  date: new Date().toISOString().slice(0, 10),
  score: 7,
  total: 10,
  note: '',
})
const attempts = ref([])

function load() {
  attempts.value = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(attempts.value))
}

function addAttempt() {
  const s = Number(form.value.score),
    t = Number(form.value.total)
  if (!t || s < 0 || s > t) return
  attempts.value.push({
    id: crypto.randomUUID(),
    ...form.value,
    score: s,
    total: t,
    percent: Math.round((s / t) * 100),
  })
  save()
  form.value.note = ''
}

const avgPercent = computed(() => {
  if (!attempts.value.length) return 0
  return Math.round(attempts.value.reduce((sum, a) => sum + a.percent, 0) / attempts.value.length)
})

// ---- export ----
const selectedIds = ref([])
const exportHeaders = ['Date', 'Score', 'Total', 'Percent', 'Note']
const exportRows = computed(() => {
  const src = selectedIds.value.length
    ? attempts.value.filter((a) => selectedIds.value.includes(a.id))
    : attempts.value
  return src.map((a) => [a.date, a.score, a.total, `${a.percent}%`, a.note || ''])
})
function onExportCSV() {
  exportCSV('quiz_results', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF('quiz_results', 'Quiz Results', exportHeaders, exportRows.value)
}

onMounted(load)
</script>

<template>
  <div class="container mt-5">
    <h2 class="mb-3">Self-check Quiz (Results)</h2>

    <div class="alert alert-info">
      Minimal version for E.4: record your latest score here to build a results list. Later we can
      replace this form with a real quiz and keep the same export.
    </div>

    <div class="card p-3 mb-3">
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label">Date</label>
          <input type="date" class="form-control" v-model="form.date" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Score</label>
          <input type="number" min="0" class="form-control" v-model.number="form.score" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Total</label>
          <input type="number" min="1" class="form-control" v-model.number="form.total" />
        </div>
        <div class="col-md-5">
          <label class="form-label">Note</label>
          <input type="text" class="form-control" v-model="form.note" placeholder="optional" />
        </div>
      </div>
      <div class="mt-2">
        <button class="btn btn-primary" @click="addAttempt">Add Result</button>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge bg-secondary">Average: {{ avgPercent }}%</span>

      <small class="text-muted ms-auto"
        >Selected: {{ selectedIds.length }} / {{ attempts.length }}</small
      >
      <div class="btn-group">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="selectedIds = attempts.map((a) => a.id)"
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

    <table class="table">
      <thead>
        <tr>
          <th style="width: 36px">Sel</th>
          <th>Date</th>
          <th>Score</th>
          <th>Total</th>
          <th>Percent</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in attempts" :key="a.id">
          <td>
            <input type="checkbox" class="form-check-input" :value="a.id" v-model="selectedIds" />
          </td>
          <td>{{ a.date }}</td>
          <td>{{ a.score }}</td>
          <td>{{ a.total }}</td>
          <td>{{ a.percent }}%</td>
          <td>{{ a.note }}</td>
        </tr>
        <tr v-if="attempts.length === 0">
          <td colspan="6" class="text-center text-muted">No results yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
