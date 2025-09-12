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
import { normalizeUsername, sha256 } from '@/utils/security'
import { onMounted } from 'vue'

// input field
const username = ref('')
const password = ref('')

// Error message
const usernameError = ref('')
const passwordError = ref('')

const router = useRouter()

// Initialise administrator account (hash storage)
onMounted(async () => {
  if (!localStorage.getItem('admin')) {
    const adminHash = await sha256('admin123')
    localStorage.setItem(
      'admin',
      JSON.stringify({ username: 'admin', passwordHash: adminHash, role: 'admin' }),
    )
  }
})

const handleLogin = async () => {
  usernameError.value = ''
  passwordError.value = ''

  if (!username.value.trim()) {
    usernameError.value = 'Username is required'
    return
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
    return
  }

  const safeUsername = normalizeUsername(username.value)
  // Retrieve the localStorage data corresponding to the currently entered username.
  const storedUser = JSON.parse(localStorage.getItem(`user:${safeUsername}`) || 'null')

  // Check if it is an administrator account
  const adminAccount = JSON.parse(localStorage.getItem('admin') || 'null')
  const inputHash = await sha256(password.value)

  let currentUser = null

  if (
    adminAccount &&
    safeUsername === adminAccount.username &&
    inputHash === adminAccount.passwordHash
  ) {
    currentUser = { username: adminAccount.username, role: 'admin' }
  } else if (storedUser && inputHash === storedUser.passwordHash) {
    currentUser = { username: storedUser.username, role: storedUser.role || 'user' }
  }

  if (currentUser) {
    localStorage.setItem('user', JSON.stringify(currentUser))
    router.replace('/')
    setTimeout(() => location.reload(), 100)
  } else {
    if (!storedUser && (!adminAccount || safeUsername !== 'admin')) {
      usernameError.value = 'Username does not exist'
    } else {
      passwordError.value = 'Incorrect password'
    }
  }
}
</script>
