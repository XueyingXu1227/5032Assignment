<template>
  <div class="container mt-5">
    <h2 class="text-center mb-4">Login</h2>

    <form @submit.prevent="handleLogin" novalidate>
      <!-- Username -->
      <div class="mb-3">
        <label for="username" class="form-label">Username</label>
        <input
          type="text"
          class="form-control"
          id="username"
          v-model="username"
          :class="{ 'is-invalid': usernameError }"
        />
        <div class="invalid-feedback">{{ usernameError }}</div>
      </div>

      <!-- Password -->
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input
          type="password"
          class="form-control"
          id="password"
          v-model="password"
          :class="{ 'is-invalid': passwordError }"
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
      </div>

      <!-- Submit -->
      <button type="submit" class="btn btn-success w-100">Login</button>

      <!-- Optional link to Sign Up -->
      <p class="mt-3 text-center">
        Don't have an account?
        <router-link to="/signup">Sign up here</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

// input field
const username = ref('')
const password = ref('')

// Error message
const usernameError = ref('')
const passwordError = ref('')

const router = useRouter()

// login function
const handleLogin = () => {
  validateUsername()
  validatePassword()

  if (usernameError.value || passwordError.value) return

  // Read registration information from localStorage
  const storedAdmin = JSON.parse(localStorage.getItem('admin') || 'null')
  const storedUser = JSON.parse(localStorage.getItem(username.value) || 'null')

  let validLogin = false
  let currentUser = null

  // Judgement is an administrator
  if (
    storedAdmin &&
    storedAdmin.username === username.value &&
    storedAdmin.password === password.value
  ) {
    validLogin = true
    currentUser = storedAdmin
  }

  // Determine that it is a regular user
  else if (storedUser && storedUser.password === password.value) {
    validLogin = true
    currentUser = { username: storedUser.username, role: 'user' }
  }

  // Login Successful
  if (validLogin) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser))
    router.push('/')
  } else {
    alert('Invalid username or password')
  }
}

// Make sure the administrator account is written to localStorage
const existingAdmin = localStorage.getItem('admin')
if (!existingAdmin) {
  localStorage.setItem(
    'admin',
    JSON.stringify({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
    }),
  )
}
</script>
