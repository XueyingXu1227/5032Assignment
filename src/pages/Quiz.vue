<script setup>
import { ref, computed, onMounted } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'

const LS_KEY = 'quizAttempts'

// form
const form = ref({
  date: new Date().toISOString().slice(0, 10),
  score: 7,
  total: 10,
  note: '',
})

// data
const attempts = ref([])

function load() {
  attempts.value = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(attempts.value))
}

function addAttempt() {
  const s = Number(form.value.score)
  const t = Number(form.value.total)
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
const selectedIds = ref([]) // ✅ 用这个，不是 selectedRows
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
    <h1 class="mb-3">Self-check Quiz</h1>

    <div class="alert alert-info mb-3" role="region" aria-label="About this page">
      <strong>Track your quiz progress</strong>
      <ul class="mb-0 mt-2">
        <li>Use this page to <em>record and review</em> your past self-check quiz results.</li>
        <li>You can try the self-check quiz below, then come back to log your score here.</li>
      </ul>
      <a
        href="/quiz-demo"
        class="btn btn-outline-primary btn-sm mt-2"
        target="_blank"
        rel="noopener"
      >
        🧩 Try Quiz Demo
      </a>
    </div>

    <div class="card p-3 mb-3">
      <div class="row g-2">
        <div class="row mb-3">
          <div class="col-md-3">
            <label for="dateInput" class="form-label">Date</label>
            <input id="dateInput" type="date" v-model="form.date" class="form-control" />
          </div>
          <div class="col-md-2">
            <label for="scoreInput" class="form-label">Score</label>
            <input id="scoreInput" type="number" v-model="form.score" class="form-control" />
          </div>
          <div class="col-md-2">
            <label for="totalInput" class="form-label">Total</label>
            <input id="totalInput" type="number" v-model="form.total" class="form-control" />
          </div>
        </div>
        <div class="col-md-5">
          <label class="form-label" for="noteInput">Note</label>
          <input
            id="noteInput"
            type="text"
            class="form-control"
            v-model="form.note"
            placeholder="optional"
          />
        </div>
      </div>
      <div class="mt-2">
        <button class="btn btn-primary" @click="addAttempt">Add Result</button>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge bg-secondary">Average: {{ avgPercent }}%</span>

      <small class="text-muted ms-auto">
        Selected: {{ selectedIds.length }} / {{ attempts.length }}
      </small>

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
          <th scope="col" style="width: 48px">Sel</th>
          <th scope="col">Date</th>
          <th scope="col">Score</th>
          <th scope="col">Total</th>
          <th scope="col">Percent</th>
          <th scope="col">Note</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(a, idx) in attempts" :key="a.id || idx">
          <td>
            <input
              type="checkbox"
              class="form-check-input"
              :id="`select-${a.id || idx}`"
              :value="a.id"
              v-model="selectedIds"
            />
            <label class="visually-hidden" :for="`select-${a.id || idx}`">
              Select row {{ idx + 1 }}
            </label>
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
