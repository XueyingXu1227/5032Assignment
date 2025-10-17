<script setup>
import { ref } from 'vue'

/* Form state */
const score = ref(null)
const submitted = ref(false)
const answers = ref({})

/* simple questions array used by the form */
const questions = [
  {
    id: 1,
    text: '1. How many minutes of exercise is recommended per day?',
    options: ['10 minutes', '30 minutes', '60 minutes'],
    correct: '30 minutes',
  },
  {
    id: 2,
    text: '2. Which food is high in protein?',
    options: ['Rice', 'Chicken', 'Apple'],
    correct: 'Chicken',
  },
  {
    id: 3,
    text: '3. What is a good way to reduce stress?',
    options: ['Sleep less', 'Do breathing exercises', 'Skip meals'],
    correct: 'Do breathing exercises',
  },
]

/* count correct answers on submit */
function submitQuiz() {
  let correct = 0
  questions.forEach((q) => {
    if (answers.value[q.id] === q.correct) correct++
  })
  score.value = correct
  submitted.value = true
}

/* clear state to retake the quiz */
function resetQuiz() {
  submitted.value = false
  score.value = null
  answers.value = {}
}
</script>

<template>
  <div class="container mt-4">
    <!-- demo quiz users can try quickly -->
    <h2 class="mb-3">Self-check Quiz Demo</h2>

    <!-- short instructions in an alert box -->
    <div class="alert alert-info small mb-3">
      This is a short demo quiz. Select your answers and click
      <strong>Submit</strong> to see your score.
    </div>

    <!-- radios bound to answers; prevents page reload -->
    <form v-if="!submitted" @submit.prevent="submitQuiz">
      <div v-for="q in questions" :key="q.id" class="mb-4">
        <p>
          <strong>{{ q.text }}</strong>
        </p>
        <div class="form-check" v-for="opt in q.options" :key="opt">
          <input
            class="form-check-input"
            type="radio"
            :name="`q${q.id}`"
            :id="`q${q.id}-${opt}`"
            :value="opt"
            v-model="answers[q.id]"
          />
          <label class="form-check-label" :for="`q${q.id}-${opt}`">{{ opt }}</label>
        </div>
      </div>
      <button class="btn btn-primary" type="submit">Submit</button>
    </form>

    <!-- show score and link to record it on results page -->
    <div v-else class="text-center mt-4">
      <h4>Your score: {{ score }}/{{ questions.length }}</h4>
      <p>
        Good job! You can record your score on the
        <RouterLink to="/quiz">Results page</RouterLink>.
      </p>
      <button type="button" class="btn btn-outline-secondary mt-2" @click="resetQuiz">
        Retake Quiz
      </button>
    </div>
  </div>
</template>

<style scoped>
/* limit width for nicer reading on large screens */
.container {
  max-width: 700px;
}
</style>
