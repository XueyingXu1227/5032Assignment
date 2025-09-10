<template>
  <div class="rating">
    <span
      v-for="star in 5"
      :key="star"
      @click="selectRating(star)"
      :class="{ filled: star <= selectedRating }"
    >
      ★
    </span>
    <button class="btn btn-sm btn-primary ms-2" @click="submitRating" :disabled="!selectedRating">
      Submit
    </button>

    <div v-if="averageRating !== null" class="mt-1">
      Average Rating: {{ averageRating.toFixed(1) }} ({{ totalRatings }} ratings)
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  // Unique ID for each recipe
  recipeId: String,
})

const selectedRating = ref(0)
const averageRating = ref(null)
const totalRatings = ref(0)

onMounted(() => {
  loadRatings()
})

function selectRating(star) {
  selectedRating.value = star
}

function submitRating() {
  const key = `ratings_${props.recipeId}`
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push(selectedRating.value)
  localStorage.setItem(key, JSON.stringify(existing))
  loadRatings()
  selectedRating.value = 0
}

function loadRatings() {
  const key = `ratings_${props.recipeId}`
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  if (existing.length) {
    const total = existing.reduce((sum, r) => sum + r, 0)
    averageRating.value = total / existing.length
    totalRatings.value = existing.length
  } else {
    averageRating.value = null
    totalRatings.value = 0
  }
}
</script>

<style scoped>
.rating span {
  font-size: 24px;
  cursor: pointer;
  color: #ccc;
}

.rating .filled {
  color: gold;
}
</style>
