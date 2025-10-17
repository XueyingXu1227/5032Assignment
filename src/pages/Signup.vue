<template>
  <div class="container mt-5">
    <!-- user creates an account -->
    <h2 class="text-center mb-4">Sign Up</h2>

    <!-- show inline errors for each field -->
    <form @submit.prevent="handleSubmit" novalidate>
      <!--Email field with basic format check -->
      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          v-model="email"
          required
          aria-describedby="emailHelp emailErr"
          @blur="validateEmail"
        />
        <div id="emailHelp" class="form-text">We’ll never share your email.</div>
        <p id="emailErr" class="invalid-feedback" role="alert">{{ emailError }}</p>
      </div>

      <!--Username rules : 2–20 chars letters/numbers/_ -->
      <div class="mb-3">
        <label for="username" class="form-label">
          Username <small class="text-muted">(min. 2 characters: letters/numbers/_)</small>
        </label>
        <input
          id="username"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': usernameError }"
          v-model="username"
          required
          aria-describedby="usernameErr"
          @blur="validateUsername"
        />
        <p id="usernameErr" class="invalid-feedback" role="alert">{{ usernameError }}</p>
      </div>

      <!--Password rules: 6, chars letters , numbers -->
      <div class="mb-3">
        <label for="password" class="form-label">
          Password <small class="text-muted">(min. 6 chars, letters+numbers)</small>
        </label>
        <input
          id="password"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': passwordError }"
          v-model="password"
          required
          minlength="6"
          aria-describedby="pwdErr"
          @blur="validatePassword"
        />
        <p id="pwdErr" class="invalid-feedback" role="alert">{{ passwordError }}</p>
      </div>

      <!--Confirm password must match -->
      <div class="mb-3">
        <label for="confirmPassword" class="form-label">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': confirmPasswordError }"
          v-model="confirmPassword"
          required
          aria-describedby="cpErr"
          @blur="validateConfirmPassword"
        />
        <p id="cpErr" class="invalid-feedback" role="alert">{{ confirmPasswordError }}</p>
      </div>

      <!-- Submit to create account -->
      <button type="submit" class="btn btn-primary w-100">Register</button>
    </form>
  </div>
</template>

<script setup>
/*sign up with Firebase and save username */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import auth from '@/services/auth'

/* Form fields */
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')

/* Error messages */
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const emailError = ref('')

const router = useRouter()

/*username pattern check */
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

/* password needs letters and numbers */
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

/* confirm must match password */
const validateConfirmPassword = () => {
  confirmPasswordError.value =
    confirmPassword.value === password.value ? '' : 'Passwords do not match'
}

/*simple email format check */
const validateEmail = () => {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  emailError.value = email.value.trim() && ok ? '' : 'Valid email is required'
}

/* try sign up; show friendly error based on Firebase code */
const handleSubmit = async () => {
  validateEmail()
  validateUsername()
  validatePassword()
  validateConfirmPassword()
  if (emailError.value || usernameError.value || passwordError.value || confirmPasswordError.value)
    return
  try {
    await auth.signUp(email.value, password.value, { username: username.value })
    alert('Registration successful!')
    router.push('/login')
  } catch (e) {
    // map firebase errors to field messages
    console.error('Firebase signUp error:', e.code, e.message)
    const map = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email format',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/operation-not-allowed': 'Email/Password sign-in is disabled in Firebase',
      'permission-denied': 'No permission to write user profile',
      'auth/network-request-failed': 'Network error, please retry',
      'auth/invalid-api-key': 'Firebase API key/config is invalid',
    }
    const msg = map[e?.code] || 'Registration failed'

    if (e?.code?.startsWith('auth/invalid-email') || e?.code === 'auth/email-already-in-use') {
      emailError.value = msg
    } else if (e?.code === 'auth/weak-password') {
      passwordError.value = msg
    } else {
      usernameError.value = msg
    }
  }
}
</script>
