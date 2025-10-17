<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import store from '@/services/storage'
import { exportCSV, exportPDF } from '@/services/export'
import { logEvent } from '@/services/analyticsService'
import { enqueue, flush } from '@/services/offlineQueue'
/* Offline feature — flush queued events when page opens */
onMounted(() => {
  flush(async (t) => {
    if (t.name === 'resource_click') await logEvent('resource_click', { slug: t.payload?.slug })
  })
})
/*if offline, queue the click; if online, log it now */
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

/* Selection state for export and bulk operations */
const selectedIds = ref([])
/* Raw resources from storage */
const all = ref([])
/* sort by chosen column and direction */
const sortBy = ref('title')
const sortDir = ref('asc')
/* simple pagination with fixed page size */
const pageSize = 10
const page = ref(1)
/* per column filters */
const filters = reactive({ title: '', type: '', topic: '' })
const norm = (s) => (s ?? '').toString().trim().toLowerCase()
/* Load data for the table */
onMounted(async () => {
  all.value = await store.getResources()
})

/* Build options for the Type filter */
const typeOptions = computed(() => {
  const set = new Set(all.value.map((r) => r.type).filter(Boolean))
  return Array.from(set).sort()
})

/* filter then sort rows */
const filteredSorted = computed(() => {
  const fTitle = norm(filters.title)
  const fType = norm(filters.type)
  const fTopic = norm(filters.topic)

  let rows = all.value.filter((r) => {
    const okTitle = !fTitle || norm(r.title).includes(fTitle)
    const okType = !fType || norm(r.type) === fType
    const okTopic = !fTopic || norm(r.topic).includes(fTopic)
    return okTitle && okType && okTopic
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  rows = [...rows].sort((a, b) => {
    const A = norm(a[sortBy.value])
    const B = norm(b[sortBy.value])
    if (A < B) return -1 * dir
    if (A > B) return 1 * dir
    return 0
  })
  return rows
})

/* compute totals and current page slice */
const total = computed(() => filteredSorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const paged = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * pageSize
  return filteredSorted.value.slice(start, start + pageSize)
})

/* change sort and pagination controls */
function changeSort(field) {
  if (sortBy.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
}
function goto(p) {
  if (p >= 1 && p <= totalPages.value) page.value = p
}
function goFirstPage() {
  page.value = 1
}

/* build headers and rows for CSV or PDF */
const exportHeaders = ['Title', 'Type', 'Topic', 'Link']
const exportRows = computed(() => {
  const source = selectedIds.value.length
    ? filteredSorted.value.filter((r) => selectedIds.value.includes(r.id))
    : filteredSorted.value
  return source.map((r) => [r.title || '', r.type || '', r.topic || '', r.url || ''])
})
/* export visible or selected rows to CSV or PDF */
function onExportCSV() {
  exportCSV('resources', exportHeaders, exportRows.value)
}
function onExportPDF() {
  exportPDF('resources', 'Learning Resources', exportHeaders, exportRows.value)
}
</script>

<template>
  <div class="container mt-4">
    <!-- clear heading and description -->
    <section aria-labelledby="about-title" class="mb-4">
      <h1 id="about-title" class="mb-3">About Sub-health</h1>
      <div class="alert alert-info mb-3" role="region" aria-label="Learn about sub-health">
        <strong>Learn and practice</strong>
        <p class="mt-2">
          "Sub-health" refers to a state between health and illness, with common signs like fatigue,
          poor sleep quality, reduced immunity and mood swings.
        </p>
        <p>
          This page provides a searchable, sortable list of learning resources (articles and videos)
          to help you improve your well-being.
        </p>
        <ul class="mb-0">
          <li>Browse curated articles and videos on nutrition, sleep, and exercise.</li>
          <li>Use the filters above to quickly find what you need.</li>
          <li>Click <em>Open</em> to view a resource (it opens in a new tab).</li>
        </ul>
      </div>
    </section>

    <!-- toolbar with sort, select all, clear, export -->
    <section aria-labelledby="resources-title">
      <div class="d-flex align-items-center gap-2 mb-2">
        <h3 id="resources-title" class="me-auto mb-0">Learning Resources</h3>

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

        <!-- Select helpers and Export group -->
        <div class="d-flex align-items-center gap-2 ms-auto">
          <small class="text-muted"
            >Selected: {{ selectedIds.length }} / {{ filteredSorted.length }}</small
          >
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
        </div>
      </div>

      <!-- sortable, filterable, paginated table -->
      <!-- caption explains how to use filters and sorting -->
      <div class="table-responsive">
        <table class="table table-striped align-middle" aria-describedby="help-caption">
          <caption id="help-caption" class="visually-hidden">
            Sortable, paginated table with individual column filters. Use the second header row to
            filter each column.
          </caption>

          <thead>
            <!-- column header -->
            <tr>
              <th scope="col" style="width: 36px">Sel</th>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Topic</th>
              <th scope="col">Link</th>
            </tr>
            <!-- Per-column filter inputs -->
            <tr>
              <th></th>
              <th>
                <label class="visually-hidden" for="f-title">Filter title</label>
                <input
                  id="f-title"
                  class="form-control form-control-sm"
                  v-model.trim="filters.title"
                  placeholder="Filter title"
                  @input="goFirstPage"
                />
              </th>
              <th>
                <label class="visually-hidden" for="f-type">Filter type</label>
                <select
                  id="f-type"
                  class="form-select form-select-sm"
                  v-model="filters.type"
                  @change="goFirstPage"
                >
                  <option value="">All types</option>
                  <option v-for="opt in typeOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </th>
              <th>
                <label class="visually-hidden" for="f-topic">Filter topic</label>
                <input
                  id="f-topic"
                  class="form-control form-control-sm"
                  v-model.trim="filters.topic"
                  placeholder="Filter topic"
                  @input="goFirstPage"
                />
              </th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            <!-- Row selection for export or review -->
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
              <!--use openResource to queue or log clicks -->
              <td><a href="#" @click.prevent="openResource(r)">Open</a></td>
            </tr>
            <tr v-if="paged.length === 0">
              <td colspan="5" class="text-center text-muted">No results</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- agination controls with Prev and Next -->
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
