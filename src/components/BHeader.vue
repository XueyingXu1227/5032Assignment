<script setup>
/* header watches Firebase auth, shows name, checks admin, shows admin links.
   global top nav shared by all pages. */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import auth from '@/services/auth'
import { db } from '@/firebase/init'
import { doc, getDoc } from 'firebase/firestore'

/* Router instance */
const router = useRouter()

/* Display name for current user (username or email) */
const displayName = ref('')

/* Admin flag */
const isAdmin = ref(false)

/* Unsubscribe holder for auth listener */
let stop

/* On mount: listen to login state and update UI (BR (C.1)) */
onMounted(() => {
  stop = auth.onAuthStateChanged(async (u) => {
    // Not logged in
    if (!u) {
      displayName.value = ''
      isAdmin.value = false
      return
    }

    // Logged in: try Firestore username, fallback to email (BR (B.2): read dynamic user data)
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      const uname = snap.exists() ? snap.data()?.username : ''
      displayName.value = uname || u.email || ''
    } catch {
      displayName.value = u.email || ''
    }

    // Get role to decide admin-only links (BR (C.1))
    const role = await auth.getCurrentUserRole()
    isAdmin.value = role === 'admin'
  })
})

/* On unmount: remove auth listener (BR (C.1)) */
onBeforeUnmount(() => {
  if (typeof stop === 'function') stop()
})

/* Logout then go to login page (BR (C.1)) */
async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <!-- BR (A.2): Layout — top header with primary nav -->
  <header class="site-header border-bottom">
    <div class="container-nav">
      <!-- BR (E.3): Accessibility — primary navigation landmark -->
      <nav class="primary-nav" aria-label="Primary navigation">
        <RouterLink class="nav-link" to="/">Home</RouterLink>
        <RouterLink class="nav-link" to="/programs">Programs</RouterLink>
        <RouterLink class="nav-link" to="/quiz">Self-check Quiz</RouterLink>
        <RouterLink class="nav-link" to="/tracker">Habit Tracker</RouterLink>
        <RouterLink class="nav-link" to="/learn">Learn</RouterLink>
        <RouterLink class="nav-link" to="/map">Healthy Map</RouterLink>

        <!-- Admin-only links (BR (C.1)) -->
        <RouterLink v-if="isAdmin" class="nav-link" to="/emailmanagement"
          >Email Management</RouterLink
        >
        <RouterLink v-if="isAdmin" class="nav-link" to="/admin">Dashboard</RouterLink>
        <RouterLink v-if="isAdmin" class="nav-link" to="/analytics">Analytics</RouterLink>
      </nav>

      <!-- Account area: shows name and logout when logged in (BR (C.1)) -->
      <div class="account-zone" role="group" aria-label="Account">
        <!-- Logged-in view -->
        <template v-if="displayName">
          <span class="welcome">Welcome, {{ displayName }}</span>
          <a href="#" class="logout" @click.prevent="logout" aria-label="Logout">Logout</a>
        </template>

        <!-- Logged-out view -->
        <RouterLink v-else class="btn-login" to="/login" aria-label="Login">Login</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* BR (A.2): Header layout and theming */
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

/* Current route highlight */
.router-link-active {
  color: #0a58ca;
  border-bottom: 2px solid #0a58ca;
}

/* Account area */
.account-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.welcome {
  color: #495057;
}

/* Logout link */
.logout {
  color: #0a58ca;
  text-decoration: none;
  border-bottom: 1px dotted transparent;
}
.logout:hover {
  border-bottom-color: #0a58ca;
}

/* Login button */
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

/* Header background */
.site-header {
  background: #d7eef6;
}
</style>
