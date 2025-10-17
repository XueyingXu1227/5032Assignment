<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { exportCSV, exportPDF } from '@/services/export'
import services from '@/services/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { flush } from '@/services/offlineQueue'

// 今天（禁止选择未来日期）
const todayStr = new Date().toISOString().slice(0, 10)

// 登录用户
const uid = ref(null)

// 列表数据（用于渲染）
const quizRows = ref([])

// 表单
const quizForm = ref({
  date: todayStr,
  score: 7,
  total: 10,
  note: '',
})

// —— 队列 flush（把离线期间添加的 quiz 同步到云端）
async function flushQuizQueue() {
  await flush(async (task) => {
    if (task.name === 'quiz_sync') {
      await services.syncQuizTask(task.payload)
    }
  })
}
function onOnline() {
  flushQuizQueue()
  loadQuizRange()
}

// 首次加载 & 绑定 online 事件
onMounted(() => {
  window.addEventListener('online', onOnline)
  const auth = getAuth()
  onAuthStateChanged(auth, (user) => {
    uid.value = user ? user.uid : null
    loadQuizRange()
  })
  flushQuizQueue()
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
})

// 读取：本地优先，在线时合并云端
async function loadQuizRange() {
  if (!uid.value) return
  quizRows.value = await services.getQuizResults(
    { from: '0000-01-01', to: '9999-12-31' },
    uid.value,
  )
}

// 新增：先本地立即显示，再写云或入队
async function addQuiz() {
  const s = Number(quizForm.value.score)
  const t = Number(quizForm.value.total)
  if (new Date(quizForm.value.date) > new Date(todayStr)) {
    alert('Date cannot be in the future.')
    return
  }
  if (!t || s < 0 || s > t) return

  const item = await services.addQuizResult({ ...quizForm.value }, uid.value)
  // 立刻插入到页面的数组（离线时有 pending: true）
  quizRows.value = [item, ...quizRows.value]

  // 清理备注
  quizForm.value.note = ''
}

// —— 统计与导出（都使用 quizRows）
const selectedIds = ref([])
const avgPercent = computed(() => {
  if (!quizRows.value.length) return 0
  const total = quizRows.value.reduce((sum, a) => {
    const p = a.total ? Math.round(((Number(a.score) || 0) / Number(a.total)) * 100) : 0
    return sum + p
  }, 0)
  return Math.round(total / quizRows.value.length)
})

const exportHeaders = ['Date', 'Score', 'Total', 'Percent', 'Note']
const exportRows = computed(() => {
  const src = selectedIds.value.length
    ? quizRows.value.filter((a) => selectedIds.value.includes(a.id))
    : quizRows.value
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

    <!-- 表单 -->
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
        <button class="btn btn-primary" @click="addQuiz">Add Result</button>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge bg-secondary">Average: {{ avgPercent }}%</span>

      <small class="text-muted ms-auto">
        Selected: {{ selectedIds.length }} / {{ quizRows.length }}
      </small>

      <div class="btn-group">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="selectedIds = quizRows.map((a) => a.id)"
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
        <tr v-for="(a, idx) in quizRows" :key="a.id || idx">
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
            <span v-if="a.pending" class="text-muted small ms-1">(Pending)</span>
          </td>
          <td>{{ a.note }}</td>
        </tr>

        <tr v-if="quizRows.length === 0">
          <td colspan="6" class="text-center text-muted">No results yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
