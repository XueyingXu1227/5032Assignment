<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import auth from '@/services/auth'

const router = useRouter()
const username = ref('')
const isAdmin = ref(false)

onMounted(async () => {
  const me = auth.getCurrentUser()
  username.value = me?.username || me?.email || ''
  const role = auth.getCurrentUserRole()
  isAdmin.value = role === 'admin'
})

const logout = async () => {
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

    <router-link to="/about">About</router-link>
    <span v-if="username">
      Welcome, {{ username }} |
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
