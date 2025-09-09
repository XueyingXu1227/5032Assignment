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

// Write down the administrator account
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

// login function
const handleLogin = () => {
  usernameError.value = ''
  passwordError.value = ''

  if (usernameError.value || passwordError.value) return

  // Read registration information from localStorage
  const savedUsername = localStorage.getItem('username')
  const savedPassword = localStorage.getItem('password')

  // Get administrator account
  const adminAccount = JSON.parse(localStorage.getItem('admin'))

  let isValid = false
  let currentUser = null

  // If an administrator
  if (username.value === adminAccount.username && password.value === adminAccount.password) {
    isValid = true
    currentUser = { username: adminAccount.username, role: 'admin' }
  }

  // If a regular user
  else if (username.value === savedUsername && password.value === savedPassword) {
    isValid = true
    currentUser = { username: savedUsername, role: 'user' }
  }

  // Successful login
  if (isValid) {
    localStorage.setItem('user', JSON.stringify(currentUser))
    router.replace('/')
    setTimeout(() => {
      location.reload()
    }, 100)
  } else {
    if (username.value !== adminAccount.username && username.value !== savedUsername) {
      usernameError.value = 'Username does not exist'
    } else {
      passwordError.value = 'Incorrect password'
    }
  }
}
</script>
