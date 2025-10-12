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
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/programs">Programs</router-link>
    <router-link to="/quiz">Self-check Quiz</router-link>
    <router-link to="/tracker">Habit Tracker</router-link>
    <router-link to="/community">Community</router-link>
    <router-link v-if="isAdmin" to="/user-management">User Management</router-link>
    <router-link v-if="isAdmin" to="/content-management">Content Management</router-link>
    <router-link to="/learn">Learn</router-link>
    <router-link to="/map">Healthy Map</router-link>

    <span v-if="displayName">
      Welcome, {{ displayName }} |
      <a href="#" @click.prevent="logout">Logout</a>
    </span>
    <router-link v-else to="/login">Login</router-link>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  gap: 20px;
  padding: 10px;
  background-color: #f8f8f8;
}

a {
  text-decoration: none;
  color: #333;
}
</style>
