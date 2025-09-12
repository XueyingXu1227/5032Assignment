<template>
  <div class="container mt-5">
    <h2 class="text-center mb-4">Sign Up</h2>

    <form @submit.prevent="handleSubmit" novalidate>
      <!-- User name input box -->
      <div class="mb-3">
        <label for="username" class="form-label"
          >Username
          <small class="text-muted">(min. 2 characters (letters, numbers, underscores))</small>
        </label>
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
          >Password
          <small class="text-muted">(min. 6 characters with letters and numbers )</small></label
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
import { useRouter } from 'vue-router'
import { normalizeUsername, sha256 } from '@/utils/security'

// User input fields
const username = ref('')
const password = ref('')
const confirmPassword = ref('')

// Error message
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

const router = useRouter()

// Individual authentication of user names
const validateUsername = () => {
  const regex = /^[a-zA-Z0-9_]{2,20}$/
  if (!username.value.trim()) {
    usernameError.value = 'Username is required'
  } else if (!regex.test(username.value)) {
    usernameError.value = 'Username must be 2–20 characters (letters, numbers, underscores)'
  } else {
    usernameError.value = ''
  }
}

// Verify passwords individually
const validatePassword = () => {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/
  if (!password.value) {
    passwordError.value = 'Password is required'
  } else if (!regex.test(password.value)) {
    passwordError.value = 'Password must be at least 6 characters with letters and numbers'
  } else {
    passwordError.value = ''
  }
}

// Individual verification of confirmation password
const validateConfirmPassword = () => {
  confirmPasswordError.value =
    confirmPassword.value === password.value ? '' : 'Passwords do not match'
}

// Submit Handler Functions
const handleSubmit = async () => {
  validateUsername()
  validatePassword()
  validateConfirmPassword()

  if (!usernameError.value && !passwordError.value && !confirmPasswordError.value) {
    // Unified Purification Username
    const safeUsername = normalizeUsername(username.value)

    // Rename checking
    if (localStorage.getItem(`user:${safeUsername}`)) {
      usernameError.value = 'Username already exists'
      return
    }

    const passwordHash = await sha256(password.value)

    // Save User Objects
    const userObject = {
      username: safeUsername,
      passwordHash,
      role: 'user',
    }

    localStorage.setItem(`user:${safeUsername}`, JSON.stringify(userObject))
    alert('Registration successful!')
    router.push('/login')
  }
}
</script>
