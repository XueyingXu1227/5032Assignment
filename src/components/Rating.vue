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
import { useRouter } from 'vue-router'
import auth from '@/services/auth'
import store from '@/services/storage'

const props = defineProps({
  // Unique ID for each recipe
  recipeId: { type: String, required: true },
})

const selectedRating = ref(0)
const myRating = ref(null)
const averageRating = ref(null)
const totalRatings = ref(0)

onMounted(async () => {
  await loadRatings()
})

function selectRating(star) {
  selectedRating.value = star
}

async function submitRating() {
  const currentUser = auth.getCurrentUser()
  if (!currentUser) {
    alert('Please log in to rate.')
    router.push('/login')
    return
  }
  if (!selectedRating.value) return

  await store.rateRecipe(props.recipeId, currentUser.id, selectedRating.value)

  await loadRatings()

  selectedRating.value = 0
}

async function loadRatings() {
  const currentUser = auth.getCurrentUser()
  myRating.value = currentUser ? await store.getMyRating(props.recipeId, currentUser.id) : null

  const summary = await store.getRecipeRatingSummary(props.recipeId)
  averageRating.value = summary.avg ?? null
  totalRatings.value = summary.count ?? 0
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
