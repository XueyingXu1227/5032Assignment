<script setup>
import { reactive } from 'vue'

const form = reactive({
  name: '',
  email: '',
  password: '',
  age: '',
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
  age: '',
})

const validators = {
  name: (v) => (v && v.trim().length > 0) || 'Name is required.',
  email: (v) => /^\S+@\S+\.\S+$/.test(v) || 'Enter a valid email address.',
  password: (v) =>
    (v && v.length >= 6 && /[A-Z]/.test(v)) ||
    'Password needs ≥ 6 chars and at least one uppercase letter.',
  age: (v) => {
    const n = Number(v)
    return (
      (!Number.isNaN(n) && Number.isInteger(n) && n >= 16 && n <= 100) ||
      'Age must be an integer between 16 and 100.'
    )
  },
}

const validateField = (key) => {
  const ok = validators[key](form[key])
  errors[key] = ok === true ? '' : ok
  return ok === true
}

const validateAll = () => Object.keys(validators).every(validateField)

const onSubmit = () => {
  if (!validateAll()) return
  alert('Thanks! Your information passed validation.')
}
</script>

<template>
  <form class="row g-3" @submit.prevent="onSubmit" novalidate>
    <div class="col-12">
      <label class="form-label" for="name">Full Name</label>
      <input
        id="name"
        type="text"
        class="form-control"
        v-model.trim="form.name"
        @blur="() => validateField('name')"
        aria-describedby="nameHelp"
      />
      <div id="nameHelp" class="text-danger small" v-if="errors.name">{{ errors.name }}</div>
    </div>

    <div class="col-12 col-md-6">
      <label class="form-label" for="email">Email</label>
      <input
        id="email"
        type="email"
        class="form-control"
        v-model.trim="form.email"
        @blur="() => validateField('email')"
        aria-describedby="emailHelp"
      />
      <div id="emailHelp" class="text-danger small" v-if="errors.email">{{ errors.email }}</div>
    </div>

    <div class="col-12 col-md-6">
      <label class="form-label" for="password">Password</label>
      <input
        id="password"
        type="password"
        class="form-control"
        v-model="form.password"
        @blur="() => validateField('password')"
        aria-describedby="pwdHelp"
        minlength="6"
      />
      <div id="pwdHelp" class="text-danger small" v-if="errors.password">{{ errors.password }}</div>

      <div class="form-text">At least 6 characters and one uppercase letter.</div>
    </div>

    <div class="col-12 col-md-6">
      <label class="form-label" for="age">Age</label>
      <input
        id="age"
        type="number"
        class="form-control"
        v-model="form.age"
        @blur="() => validateField('age')"
        aria-describedby="ageHelp"
        min="16"
        max="100"
        step="1"
      />
      <div id="ageHelp" class="text-danger small" v-if="errors.age">{{ errors.age }}</div>
    </div>

    <div class="col-12">
      <button class="btn btn-primary" type="submit">Submit</button>
    </div>
  </form>
</template>
