<template>
  <div class="container py-3">
    <h1 class="mb-3">Admin Dashboard</h1>

    <div class="row g-3 mb-3">
      <div class="col-sm-6 col-lg-3" v-for="k in kpis" :key="k.label">
        <div class="card p-3">
          <div class="small text-muted">{{ k.label }}</div>
          <div class="fs-3 fw-bold">{{ k.value }}</div>
        </div>
      </div>
    </div>

    <AnalyticsView />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AnalyticsView from './AnalyticsView.vue'
import { getKpis } from '@/services/analyticsService'

const kpis = ref([{ label: 'Today events', value: '—' }])

onMounted(async () => {
  const r = await getKpis(1)
  kpis.value[0].value = r.todayEvents
})
</script>
