<template>
  <div class="container mt-5">
    <h2 class="text-center mb-4">Login</h2>

    <form @submit.prevent="handleLogin" novalidate>
      <!-- Email -->
      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          type="email"
          class="form-control"
          v-model="email"
          :class="{ 'is-invalid': emailError }"
          required
          aria-describedby="loginEmailErr"
        />
        <p id="loginEmailErr" class="invalid-feedback" role="alert">{{ emailError }}</p>
      </div>

      <!-- Password -->
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input
          id="password"
          type="password"
          class="form-control"
          v-model="password"
          :class="{ 'is-invalid': passwordError }"
          required
          minlength="6"
          aria-describedby="loginPwdErr"
        />
        <p id="loginPwdErr" class="invalid-feedback" role="alert">{{ passwordError }}</p>
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

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const router = useRouter()

const handleLogin = async () => {
  emailError.value = ''
  passwordError.value = ''
  if (!email.value.trim()) {
    emailError.value = 'Email is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Invalid email'
    return
  }
  if (!password.value) {
    passwordError.value = 'Password is required'
    return
  }

  try {
    await auth.signIn(email.value, password.value)
    router.replace('/')
  } catch (e) {
    passwordError.value = 'Invalid email or password'
  }
}
</script>
