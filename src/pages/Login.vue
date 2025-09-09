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
  usernameError.value = ''
  passwordError.value = ''

  // Read registration information from localStorage
  const savedUsername = localStorage.getItem('username')
  const savedPassword = localStorage.getItem('password')

  // Check for matches
  if (username.value !== savedUsername) {
    usernameError.value = 'Username does not exist'
  }
  if (password.value !== savedPassword) {
    passwordError.value = 'Incorrect password'
  }

  // Successful login
  if (!usernameError.value && !passwordError.value) {
    // Store the logged-in user information in localStorage for subsequent display.
    const userInfo = {
      username: username.value,
    }
    localStorage.setItem('user', JSON.stringify(userInfo))

    //Jump back to home page and refresh
    //router.push('/')
    router.replace('/')
    setTimeout(() => {
      location.reload()
    }, 100)
  }
}
</script>
