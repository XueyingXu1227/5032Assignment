<script setup>
import { ref, onMounted } from 'vue'

const username = ref('')
const isAdmin = ref(false)

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser)
      username.value = parsedUser.username
      isAdmin.value = parsedUser.role === 'admin'
    } catch (e) {
      console.error('Failed to parse user:', e)
    }
  }
})

// Logout logic, clear localStorage and refresh page
const logout = () => {
  localStorage.removeItem('user')
  location.reload()
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
