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
    // Preventing script injection
    const safeUsername = username.value.replace(/[<>"']/g, '')

    const userObject = {
      username: safeUsername,
      password: password.value,
      // The default role is normal user
      role: 'user',
    }

    // The user name is used as the key to store the user object
    localStorage.setItem(safeUsername, JSON.stringify(userObject))

    alert('Registration successful!')
  }
}

function validateUsername() {
  const regex = /^[a-zA-Z0-9]{6,20}$/
  if (!username.value.trim()) {
    usernameError.value = 'Username is required'
  } else if (!regex.test(username.value)) {
    usernameError.value = 'Username must be 6–20 letters or numbers only'
  } else {
    usernameError.value = ''
  }
}

function validatePassword() {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/
  if (!password.value) {
    passwordError.value = 'Password is required'
  } else if (!regex.test(password.value)) {
    passwordError.value = 'Password must be at least 6 characters with letters and numbers'
  } else {
    passwordError.value = ''
  }
}
</script>
