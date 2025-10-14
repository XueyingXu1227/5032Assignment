<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import auth from '@/services/auth'
import { db } from '@/firebase/init'
import { doc, getDoc } from 'firebase/firestore'

const router = useRouter()
const displayName = ref('')
const isAdmin = ref(false)

let stop

onMounted(() => {
  stop = auth.onAuthStateChanged(async (u) => {
    if (!u) {
      displayName.value = ''
      isAdmin.value = false
      return
    }

    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      const uname = snap.exists() ? snap.data()?.username : ''
      displayName.value = uname || u.email || ''
    } catch {
      displayName.value = u.email || ''
    }

    const role = await auth.getCurrentUserRole()
    isAdmin.value = role === 'admin'
  })
})

onBeforeUnmount(() => {
  if (typeof stop === 'function') stop()
})

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <!-- Top bar: left and right partitions, evenly spaced centre navigation -->
  <header class="site-header border-bottom">
    <div class="container-nav">
      <!-- main navigation -->
      <nav class="primary-nav" aria-label="Primary navigation">
        <RouterLink class="nav-link" to="/">Home</RouterLink>
        <RouterLink class="nav-link" to="/programs">Programs</RouterLink>
        <RouterLink class="nav-link" to="/quiz">Self-check Quiz</RouterLink>
        <RouterLink class="nav-link" to="/tracker">Habit Tracker</RouterLink>
        <RouterLink class="nav-link" to="/learn">Learn</RouterLink>
        <RouterLink class="nav-link" to="/map">Healthy Map</RouterLink>
        <RouterLink v-if="isAdmin" class="nav-link" to="/emailmanagement"
          >Email Management</RouterLink
        >
        <RouterLink v-if="isAdmin" class="nav-link" to="/admin">Dashboard</RouterLink>
        <RouterLink v-if="isAdmin" class="nav-link" to="/analytics">Analytics</RouterLink>
      </nav>

      <!-- Account area: always to the far right (unique identifier: Account) -->
      <div class="account-zone" role="group" aria-label="Account">
        <template v-if="displayName">
          <span class="welcome">Welcome, {{ displayName }}</span>
          <a href="#" class="logout" @click.prevent="logout" aria-label="Logout">Logout</a>
        </template>
        <RouterLink v-else class="btn-login" to="/login" aria-label="Login">Login</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.container-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
}

.primary-nav {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #0a2a5e;
  font-weight: 500;
}
.nav-link:hover {
  color: #081f44;
}
.router-link-active {
  color: #0a58ca;
  border-bottom: 2px solid #0a58ca;
}

.account-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.welcome {
  color: #495057;
}
.logout {
  color: #0a58ca;
  text-decoration: none;
  border-bottom: 1px dotted transparent;
}
.logout:hover {
  border-bottom-color: #0a58ca;
}
.btn-login {
  padding: 4px 10px;
  border: 1px solid #0a58ca;
  border-radius: 6px;
  text-decoration: none;
  color: #0a58ca;
}
.btn-login:hover {
  background: #d7eef6;
}

/* Top Bar Background */
.site-header {
  background: #d7eef6;
}
</style>
