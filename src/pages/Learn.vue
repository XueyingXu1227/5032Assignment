<script setup>
import { ref, computed, onMounted } from 'vue'
import store from '@/services/storage'
import { exportCSV, exportPDF } from '@/services/export'
import { sendEmail, arrayBufferToBase64, textToBase64 } from '@/services/email.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { logEvent } from '@/services/analyticsService'
import { enqueue, flush } from '@/services/offlineQueue'
onMounted(() => {
  flush(async (t) => {
    if (t.name === 'resource_click') await logEvent('resource_click', { slug: t.payload?.slug })
  })
})

const openResource = async (item) => {
  const slug = item.slug || item.id || item.title || 'unknown'
  try {
    if (navigator.onLine) {
      await logEvent('resource_click', { slug })
    } else {
      enqueue('resource_click', { slug, when: Date.now() })
    }
  } catch (e) {
    enqueue('resource_click', { slug, when: Date.now() })
  }
  if (item.url) window.open(item.url, '_blank', 'noopener')
}

// ——  About ——
const aboutParas = [
  '"Sub-health" refers to a state between health and illness, with common manifestations including fatigue, poor sleep quality, reduced immunity and mood swings.',
  'The bottom half of this page provides a searchable, sortable, paginated list of learning resources (articles/videos, etc.) to help you quickly locate what you need.',
]

// —— Form Interaction Status ——
const selectedIds = ref([])
// raw data
const all = ref([])
// Search Keywords
const q = ref('')
// Sort Fields/Directions
const sortBy = ref('title') // 'title' | 'type' | 'topic'
const sortDir = ref('asc') // 'asc' | 'desc'
// subdivision
const pageSize = 10
const page = ref(1)

onMounted(async () => {
  all.value = await store.getResources()
})

// Filtered + sorted data
const filteredSorted = computed(() => {
  const kw = q.value.trim().toLowerCase()
  let rows = all.value
  if (kw) {
    rows = rows.filter(
      (r) =>
        (r.title || '').toLowerCase().includes(kw) ||
        (r.type || '').toLowerCase().includes(kw) ||
        (r.topic || '').toLowerCase().includes(kw),
    )
  }
  const dir = sortDir.value === 'asc' ? 1 : -1
  rows = [...rows].sort((a, b) => {
    const A = (a[sortBy.value] || '').toString().toLowerCase()
    const B = (b[sortBy.value] || '').toString().toLowerCase()
    if (A < B) return -1 * dir
    if (A > B) return 1 * dir
    return 0
  })
  return rows
})

// Current page data
const total = computed(() => filteredSorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const paged = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * pageSize
  return filteredSorted.value.slice(start, start + pageSize)
})

// event
function changeSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
}
function goto(p) {
  if (p >= 1 && p <= totalPages.value) page.value = p
}

// derive
const exportHeaders = ['Title', 'Type', 'Topic', 'Link']
const exportRows = computed(() => {
  // If there are ticks, export in the order of ticks; otherwise, export all filtered
  const source = selectedIds.value.length
    ? filteredSorted.value.filter((r) => selectedIds.value.includes(r.id))
    : filteredSorted.value
  return source.map((r) => [r.title || '', r.type || '', r.topic || '', r.url || ''])
})

// Forms for sending emails
const mail = ref({
  to: '',
  subject: 'Learning resources',
  message: 'Please find the attached resources.',
})

async function onSendEmail() {
  // CSV
  const headers = exportHeaders
  const rows = exportRows.value
  const csvText = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n')
  const csvB64 = textToBase64(csvText)

  //PDF
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(16)
  doc.text('Learning Resources', 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: rows,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [240, 240, 240] },
    margin: { left: 40, right: 40 },
  })
  const pdfBuffer = doc.output('arraybuffer')
  const pdfB64 = arrayBufferToBase64(pdfBuffer)

  await sendEmail({
    to: mail.value.to,
    subject: mail.value.subject,
    html: `<p>${mail.value.message}</p>`,
    attachments: [
      { filename: 'resources.csv', type: 'text/csv', contentBase64: csvB64 },
      { filename: 'resources.pdf', type: 'application/pdf', contentBase64: pdfB64 },
    ],
  })
  alert('Email sent!')
}

function escapeCell(val) {
  const s = (val ?? '').toString()
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function onExportCSV() {
  exportCSV('resources', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF('resources', 'Learning Resources', exportHeaders, exportRows.value)
}
</script>

<template>
  <div class="container mt-4">
    <!-- About -->
    <section aria-labelledby="about-title" class="mb-4">
      <h2 id="about-title" class="mb-3">About Sub-health</h2>
      <p v-for="(t, i) in aboutParas" :key="i">{{ t }}</p>
    </section>

    <!-- Search + Sort -->
    <section aria-labelledby="resources-title">
      <div class="d-flex align-items-center gap-2 mb-2">
        <h3 id="resources-title" class="me-auto mb-0">Learning Resources</h3>

        <!-- Search -->
        <label class="visually-hidden" for="searchInput">Search resources</label>
        <input
          id="searchInput"
          class="form-control"
          style="max-width: 260px"
          type="search"
          placeholder="Search title/type/topic …"
          v-model="q"
          @input="page = 1"
        />

        <!-- Sort -->
        <div class="btn-group" role="group" aria-label="Sort">
          <button
            class="btn btn-outline-secondary"
            :aria-pressed="sortBy === 'title'"
            @click="changeSort('title')"
          >
            Title <small>({{ sortBy === 'title' ? sortDir : '' }})</small>
          </button>
          <button
            class="btn btn-outline-secondary"
            :aria-pressed="sortBy === 'type'"
            @click="changeSort('type')"
          >
            Type <small>({{ sortBy === 'type' ? sortDir : '' }})</small>
          </button>
          <button
            class="btn btn-outline-secondary"
            :aria-pressed="sortBy === 'topic'"
            @click="changeSort('topic')"
          >
            Topic <small>({{ sortBy === 'topic' ? sortDir : '' }})</small>
          </button>
        </div>
        <div class="d-flex align-items-center gap-2 ms-auto">
          <small class="text-muted">
            Selected: {{ selectedIds.length }} /
            {{ filteredSorted.length }}
          </small>
          <div class="btn-group" role="group" aria-label="Select helpers">
            <button
              class="btn btn-outline-secondary btn-sm"
              @click="selectedIds = filteredSorted.map((r) => r.id)"
            >
              Select all
            </button>
            <button class="btn btn-outline-secondary btn-sm" @click="selectedIds = []">
              Clear
            </button>
          </div>
          <div class="btn-group" role="group" aria-label="Export">
            <button class="btn btn-outline-secondary" @click="onExportCSV">Export CSV</button>
            <button class="btn btn-outline-secondary" @click="onExportPDF">Export PDF</button>
          </div>
          <div class="input-group" style="max-width: 520px">
            <span class="input-group-text">To</span>
            <input
              class="form-control"
              v-model="mail.to"
              placeholder="email1@example.com, email2@example.com"
            />
            <button class="btn btn-primary" @click="onSendEmail">Send Email</button>
          </div>
        </div>
      </div>

      <!-- tabular -->
      <div class="table-responsive">
        <table class="table table-striped">
          <caption class="visually-hidden">
            Searchable, sortable, paginated list of learning resources
          </caption>
          <thead>
            <tr>
              <th scope="col" style="width: 36px">Sel</th>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Topic</th>
              <th scope="col">Link</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paged" :key="r.id">
              <td>
                <input
                  type="checkbox"
                  class="form-check-input"
                  :value="r.id"
                  v-model="selectedIds"
                />
              </td>
              <td>{{ r.title }}</td>
              <td>{{ r.type }}</td>
              <td>{{ r.topic }}</td>
              <td>
                <a href="#" @click.prevent="openResource(r)">Open</a>
              </td>
            </tr>
            <tr v-if="paged.length === 0">
              <td colspan="4" class="text-center text-muted">No results</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- subdivision -->
      <nav class="d-flex justify-content-between align-items-center" aria-label="Pagination">
        <span class="text-muted">Total {{ total }} / Page {{ page }} of {{ totalPages }}</span>
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
    </section>
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
