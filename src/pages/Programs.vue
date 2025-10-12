<script setup>
import Rating from '@/components/Rating.vue'
import { ref, onMounted } from 'vue'
import store from '@/services/storage'

const recipes = ref([])

onMounted(async () => {
  recipes.value = await store.getRecipes()
  if (!recipes.value || recipes.value.length === 0) {
    recipes.value = [
      { id: 'recipe1', name: 'Green Salad', description: 'A healthy green salad.' },
      { id: 'recipe2', name: 'Fruit Bowl', description: 'Mixed seasonal fruits.' },
    ]
  }
})
</script>

<template>
  <div class="container mt-5">
    <h2>Healthy Recipes</h2>
    <div v-for="recipe in recipes" :key="recipe.id" class="card p-3 mb-3">
      <h4>{{ recipe.name }}</h4>
      <p>{{ recipe.description }}</p>

      <!-- Adding a scoring component -->
      <Rating :recipeId="recipe.id" />
    </div>
  </div>
</template>
