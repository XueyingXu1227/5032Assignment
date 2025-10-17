<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'
import services from '@/services/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { flush } from '@/services/offlineQueue'

/* block future dates using today string */
const todayStr = new Date().toISOString().slice(0, 10)

/* keep current user id */
const uid = ref(null)

/* combined list (local first, then cloud merged) */
const quizRows = ref([])

/*simple inputs for date/score/total/note */
const quizForm = ref({
  date: todayStr,
  score: 7,
  total: 10,
  note: '',
})

/* de-duplicate “pending + confirmed” items in view */
const visibleRows = computed(() => {
  const map = new Map()
  for (const r of quizRows.value) {
    // content fingerprint: same date/score/total/note considered the same
    const key = [r.date, Number(r.score) || 0, Number(r.total) || 0, r.note || ''].join('|')
    const existed = map.get(key)
    if (!existed) {
      map.set(key, r)
    } else {
      // prefer confirmed over pending
      if (existed.pending && !r.pending) map.set(key, r)
      // if both same state, keep the first (stable order)
    }
  }
  // keep original order
  const ordered = []
  for (const r of quizRows.value) {
    const key = [r.date, Number(r.score) || 0, Number(r.total) || 0, r.note || ''].join('|')
    const keep = map.get(key)
    if (keep) {
      ordered.push(keep)
      map.delete(key)
    }
  }
  return ordered
})

/*push queued quiz items to cloud */
async function flushQuizQueue() {
  await flush(async (task) => {
    if (task.name === 'quiz_sync') {
      await services.syncQuizTask(task.payload)
    }
  })
}

/* when back online, sync first then reload */
async function onOnline() {
  await flushQuizQueue()
  await loadQuizRange()
}

/*watch auth state, then load data */
onMounted(() => {
  window.addEventListener('online', onOnline)
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    uid.value = user ? user.uid : null
    await loadQuizRange()
  })
  // try to sync once at page open
  flushQuizQueue()
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
})

/*  load all results for this user (local-first merge) */
async function loadQuizRange() {
  if (!uid.value) return
  quizRows.value = await services.getQuizResults(
    { from: '0000-01-01', to: '9999-12-31' },
    uid.value,
  )
}

/* check date and score before adding
   local insert shows immediately; cloud write later if offline */
async function addQuiz() {
  const s = Number(quizForm.value.score)
  const t = Number(quizForm.value.total)
  if (new Date(quizForm.value.date) > new Date(todayStr)) {
    alert('Date cannot be in the future.')
    return
  }
  if (!t || s < 0 || s > t) return

  const item = await services.addQuizResult({ ...quizForm.value }, uid.value)
  // show instantly (pending when offline)
  quizRows.value = [item, ...quizRows.value]

  // if online, reload to swap pending with confirmed
  if (navigator.onLine) {
    await loadQuizRange()
  }

  // clear note for next input
  quizForm.value.note = ''
}

/* Export — compute average percent from visible rows only */
const selectedIds = ref([])
const avgPercent = computed(() => {
  if (!visibleRows.value.length) return 0
  const total = visibleRows.value.reduce((sum, a) => {
    const p = a.total ? Math.round(((Number(a.score) || 0) / Number(a.total)) * 100) : 0
    return sum + p
  }, 0)
  return Math.round(total / visibleRows.value.length)
})

/*  build CSV/PDF rows (use visibleRows to avoid duplicates) */
const exportHeaders = ['Date', 'Score', 'Total', 'Percent', 'Note']
const exportRows = computed(() => {
  const src = selectedIds.value.length
    ? visibleRows.value.filter((a) => selectedIds.value.includes(a.id))
    : visibleRows.value
  return src.map((a) => {
    const percent = a.total ? Math.round(((Number(a.score) || 0) / Number(a.total)) * 100) : 0
    return [a.date, a.score, a.total, `${percent}%`, a.note || '']
  })
})
function onExportCSV() {
  exportCSV('quiz_results', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF('quiz_results', 'Quiz Results', exportHeaders, exportRows.value)
}
</script>

<template>
  <div class="container mt-5">
    <!-- Interactive Page — simple explainer for what this page does -->
    <h1 class="mb-3">Self-check Quiz</h1>

    <!--Accessibility — region label and clear guidance -->
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

    <!--add a new quiz result (with simple checks in script) -->
    <div class="card p-3 mb-3">
      <div class="row g-2">
        <div class="row mb-3">
          <div class="col-md-3">
            <label for="dateInput" class="form-label">Date</label>
            <input
              id="dateInput"
              type="date"
              v-model="quizForm.date"
              class="form-control"
              :max="todayStr"
            />
          </div>
          <div class="col-md-2">
            <label for="scoreInput" class="form-label">Score</label>
            <input id="scoreInput" type="number" v-model="quizForm.score" class="form-control" />
          </div>
          <div class="col-md-2">
            <label for="totalInput" class="form-label">Total</label>
            <input id="totalInput" type="number" v-model="quizForm.total" class="form-control" />
          </div>
        </div>
        <div class="col-md-5">
          <label class="form-label" for="noteInput">Note</label>
          <input
            id="noteInput"
            type="text"
            class="form-control"
            v-model="quizForm.note"
            placeholder="optional"
          />
        </div>
      </div>
      <div class="mt-2">
        <!-- add result (will show immediately, pending if offline) -->
        <button class="btn btn-primary" @click="addQuiz">Add Result</button>
      </div>
    </div>

    <!--Toolbar: average, select helpers, and export buttons -->
    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge bg-secondary">Average: {{ avgPercent }}%</span>

      <small class="text-muted ms-auto">
        Selected: {{ selectedIds.length }} / {{ visibleRows.length }}
      </small>

      <div class="btn-group">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="selectedIds = visibleRows.map((a) => a.id)"
        >
          Select all
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="selectedIds = []">Clear</button>
      </div>

      <div class="btn-group">
        <!-- Export : CSV and PDF -->
        <button class="btn btn-outline-secondary" @click="onExportCSV">Export CSV</button>
        <button class="btn btn-outline-secondary" @click="onExportPDF">Export PDF</button>
      </div>
    </div>

    <!-- Interactive Table — plain table for quiz results -->
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
        <!-- selection works with selectedIds for export -->
        <tr v-for="(a, idx) in visibleRows" :key="a.id || idx">
          <td>
            <input
              type="checkbox"
              class="form-check-input"
              :id="`select-${a.id || idx}`"
              :value="a.id"
              v-model="selectedIds"
            />
            <label class="visually-hidden" :for="`select-${a.id || idx}`"
              >Select row {{ idx + 1 }}</label
            >
          </td>
          <td>{{ a.date }}</td>
          <td>{{ a.score }}</td>
          <td>{{ a.total }}</td>
          <td>
            {{ a.total ? Math.round(((Number(a.score) || 0) / Number(a.total)) * 100) : 0 }}%
            <!-- show pending tag when not yet confirmed -->
            <span v-if="a.pending" class="text-muted small ms-1">(Pending)</span>
          </td>
          <td>{{ a.note }}</td>
        </tr>

        <tr v-if="visibleRows.length === 0">
          <td colspan="6" class="text-center text-muted">No results yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
