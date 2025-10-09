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
import auth from '@/services/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
//import { normalizeUsername, sha256 } from '@/utils/security'
//import { onMounted } from 'vue'

// input field
const username = ref('')
const password = ref('')

// Error message
const usernameError = ref('')
const passwordError = ref('')

const router = useRouter()

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

  try {
    await auth.signIn(username.value, password.value)
    router.replace('/')
  } catch (e) {
    if (e?.code === 'USER_NOT_FOUND') {
      usernameError.value = 'Username does not exist'
    } else if (e?.code === 'WRONG_PASSWORD') {
      passwordError.value = 'Incorrect password'
    } else {
      passwordError.value = 'Login failed'
    }
  }
}
</script>
