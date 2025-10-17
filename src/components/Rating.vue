<template>
  <!-- BR (C.3): Rating — 5-star selector. Click to choose a rating (1–5). -->
  <div class="rating">
    <span
      v-for="star in 5"
      :key="star"
      @click="selectRating(star)"
      :class="{ filled: star <= selectedRating }"
    >
      ★
    </span>

    <!--Submit the selected rating. Disabled until a star is chosen. -->
    <button class="btn btn-sm btn-primary ms-2" @click="submitRating" :disabled="!selectedRating">
      Submit
    </button>

    <!--Aggregated rating view (avg + count). BR (B.2): Dynamic data binding. -->
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

/* BR (B.2): Dynamic Data : recipeId comes from parent; used to fetch/store ratings. */
const props = defineProps({
  // Unique ID for each recipe
  recipeId: { type: String, required: true },
})

const selectedRating = ref(0)
const myRating = ref(null)
const averageRating = ref(null)
const totalRatings = ref(0)
const router = useRouter()

/* Dynamic Data : Load current/aggregated rating when component mounts. */
onMounted(async () => {
  await loadRatings()
})

/* Simple UI state update for star selection (client-side only). */
function selectRating(star) {
  selectedRating.value = star
}

async function submitRating() {
  /* BR (C.1): Authentication : Only logged-in users can rate. Redirect to /login. */
  const currentUser = auth.getCurrentUser()
  if (!currentUser) {
    alert('Please log in to rate.')
    router.push('/login')
    return
  }
  if (!selectedRating.value) return

  /* Rating : Persist the rating for this recipe + user. */
  await store.rateRecipe(props.recipeId, currentUser.id, selectedRating.value)

  /* Rating : Refresh aggregated stats after submit. */
  await loadRatings()

  // Reset selection after submit
  selectedRating.value = 0
}

/* Rating: Get my rating and the aggregated average + count. BR (B.2) binding. */
async function loadRatings() {
  const currentUser = auth.getCurrentUser()
  myRating.value = currentUser ? await store.getMyRating(props.recipeId, currentUser.id) : null

  const summary = await store.getRecipeRatingSummary(props.recipeId)
  averageRating.value = summary.avg ?? null
  totalRatings.value = summary.count ?? 0
}
</script>

<style scoped>
/* Visual style for star rating. Large icons and hoverable cursor. */
.rating span {
  font-size: 24px;
  cursor: pointer;
  color: #ccc;
}

/* Filled stars indicate the chosen rating. */
.rating .filled {
  color: gold;
}
</style>
