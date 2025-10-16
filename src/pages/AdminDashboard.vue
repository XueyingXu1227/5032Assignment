<template>
  <div class="container py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h1 class="mb-1">Admin Dashboard</h1>
        <p class="text-muted mb-0">Overview of users and user types.</p>
      </div>

      <div class="d-flex gap-2">
        <RouterLink class="btn btn-outline-secondary btn-sm" to="/Analytics"
          >View Analytics</RouterLink
        >
        <RouterLink class="btn btn-primary btn-sm" to="/EmailManagement"
          >Send Bulk Email</RouterLink
        >
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-1">Total Users</h6>
            <div class="display-6 fw-semibold">{{ totalUsers }}</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-1">Admins</h6>
            <div class="display-6 fw-semibold">{{ adminCount }}</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-1">Users</h6>
            <div class="display-6 fw-semibold">{{ userCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <TableCard title="User Type Distribution">
      <div class="row">
        <div class="col-12 col-lg-6">
          <div role="img" aria-label="Distribution of user roles.">
            <canvas ref="pieRef" height="160"></canvas>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="table-responsive mt-3 mt-lg-0">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Role</th>
                  <th class="text-end">Count</th>
                  <th class="text-end">Share</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge bg-dark-subtle text-dark-emphasis">admin</span></td>
                  <td class="text-end">{{ adminCount }}</td>
                  <td class="text-end">{{ share(adminCount) }}</td>
                </tr>
                <tr>
                  <td><span class="badge bg-primary-subtle text-primary-emphasis">user</span></td>
                  <td class="text-end">{{ userCount }}</td>
                  <td class="text-end">{{ share(userCount) }}</td>
                </tr>
                <tr v-if="totalUsers === 0">
                  <td colspan="3" class="text-center text-muted py-3">No users</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <table class="visually-hidden">
        <caption>
          User type distribution
        </caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">admin</th>
            <td>{{ adminCount }}</td>
          </tr>
          <tr>
            <th scope="row">user</th>
            <td>{{ userCount }}</td>
          </tr>
        </tbody>
      </table>
    </TableCard>

    <TableCard title="Recent Users">
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th class="text-end">Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in recentUsers" :key="u.id">
              <td>{{ u.username || '—' }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span v-if="u.role === 'admin'" class="badge bg-dark-subtle text-dark-emphasis"
                  >admin</span
                >
                <span v-else class="badge bg-primary-subtle text-primary-emphasis">user</span>
              </td>
              <td class="text-end">{{ u.joined }}</td>
            </tr>
            <tr v-if="!recentUsers.length">
              <td colspan="4" class="text-center text-muted py-3">No users found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </TableCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TableCard from '@/components/TableCard.vue'
import { Chart } from 'chart.js/auto'
import { db } from '@/firebase/init'
import {
  collection,
  query,
  where,
  orderBy,
  limit as qlimit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'

const totalUsers = ref(0)
const adminCount = ref(0)
const userCount = ref(0)

// --- Recent users ---
const recentUsers = ref([])

// --- Pie chart ---
const pieRef = ref(null)
let pieChart

function share(count) {
  const total = totalUsers.value || 0
  if (!total) return '0%'
  return Math.round((count / total) * 100) + '%'
}

async function loadKpisAndPie() {
  const totalSnap = await getCountFromServer(collection(db, 'users'))
  totalUsers.value = totalSnap.data().count || 0

  const adminSnap = await getCountFromServer(
    query(collection(db, 'users'), where('role', '==', 'admin')),
  )
  const userSnap = await getCountFromServer(
    query(collection(db, 'users'), where('role', '==', 'user')),
  )
  adminCount.value = adminSnap.data().count || 0
  userCount.value = userSnap.data().count || 0

  const data = {
    labels: ['admin', 'user'],
    datasets: [
      {
        data: [adminCount.value, userCount.value],

        backgroundColor: ['#6c757d', '#0d6efd'],
        borderWidth: 0,
      },
    ],
  }

  if (pieChart) {
    pieChart.data = data
    pieChart.update()
  } else if (pieRef.value) {
    pieChart = new Chart(pieRef.value, {
      type: 'doughnut',
      data,
      options: {
        plugins: { legend: { position: 'bottom' } },
        cutout: '60%',
      },
    })
  }
}

async function loadRecentUsers() {
  const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), qlimit(8))
  const snap = await getDocs(qy)

  const items = []
  snap.forEach((doc) => {
    const d = doc.data()
    const raw = d.createdAt
    const date = raw?.toDate?.()
      ? raw.toDate()
      : typeof raw === 'number'
        ? new Date(raw)
        : new Date()

    items.push({
      id: doc.id,
      username: d.username || '',
      email: d.email || '',
      role: d.role || 'user',
      joined: date.toISOString().slice(0, 10),
    })
  })
  recentUsers.value = items
}

onMounted(async () => {
  await Promise.all([loadKpisAndPie(), loadRecentUsers()])
})
</script>

<style scoped>
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
}
</style>
