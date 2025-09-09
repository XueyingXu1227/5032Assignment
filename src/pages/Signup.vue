<template>
  <div class="container mt-5">
    <h2 class="text-center mb-4">Sign Up</h2>

    <form @submit.prevent="handleSubmit" novalidate>
      <!-- User name input box -->
      <div class="mb-3">
        <label for="username" class="form-label">Username</label>
        <input
          type="text"
          class="form-control"
          :class="{ 'is-invalid': usernameError }"
          id="username"
          v-model="username"
          @blur="validateUsername"
        />
        <!-- Error message  -->
        <div class="invalid-feedback">{{ usernameError }}</div>
      </div>

      <!-- Password input box -->
      <div class="mb-3">
        <label for="password" class="form-label"
          >Password <small class="text-muted">(min. 6 characters)</small></label
        >
        <input
          type="password"
          class="form-control"
          :class="{ 'is-invalid': passwordError }"
          id="password"
          v-model="password"
          @blur="validatePassword"
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
      </div>

      <!-- Confirm password input box -->
      <div class="mb-3">
        <label for="confirmPassword" class="form-label">Confirm Password</label>
        <input
          type="password"
          class="form-control"
          :class="{ 'is-invalid': confirmPasswordError }"
          id="confirmPassword"
          v-model="confirmPassword"
          @blur="validateConfirmPassword"
        />
        <div class="invalid-feedback">{{ confirmPasswordError }}</div>
      </div>

      <!-- Submit button -->
      <button type="submit" class="btn btn-primary w-100">Register</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Individual authentication of user names
const validateUsername = () => {
  usernameError.value = username.value.trim() ? '' : 'Username is required'
}

// Verify passwords individually
const validatePassword = () => {
  const pwd = password.value.trim()
  passwordError.value = password.value.length >= 6 ? '' : 'Password must be at least 6 characters'
}

// Individual verification of confirmation password
const validateConfirmPassword = () => {
  confirmPasswordError.value =
    confirmPassword.value === password.value ? '' : 'Passwords do not match'
}

// User input fields
const username = ref('')
const password = ref('')
const confirmPassword = ref('')

// Error message
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

// Submit Handler Functions
const handleSubmit = () => {
  validateUsername()
  validatePassword()
  validateConfirmPassword()

  if (!usernameError.value && !passwordError.value && !confirmPasswordError.value) {
    localStorage.setItem('username', username.value)
    localStorage.setItem('password', password.value)
    alert('Registration successful!')
  }
}
</script>
