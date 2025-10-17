<script setup>
/* users can rate each recipe and see average score */
import Rating from '@/components/Rating.vue'
import { ref, onMounted } from 'vue'
import store from '@/services/storage'

/*load recipes from local storage or use sample data */
const recipes = ref([])

onMounted(async () => {
  recipes.value = await store.getRecipes()
  if (!recipes.value || recipes.value.length === 0) {
    // Default recipes shown if storage is empty
    recipes.value = [
      { id: 'recipe1', name: 'Green Salad', description: 'A healthy green salad.' },
      { id: 'recipe2', name: 'Fruit Bowl', description: 'Mixed seasonal fruits.' },
    ]
  }
})
</script>

<template>
  <div class="container mt-5">
    <!-- page for browsing and rating recipes -->
    <h1>Healthy Recipes</h1>

    <!-- alert section explains how to interact -->
    <div class="alert alert-info mb-3" role="region" aria-label="How to use recipes">
      <strong>Explore & rate healthy recipes</strong>
      <ul class="mb-0 mt-2">
        <li>Browse the recipes below and click the stars to rate.</li>
        <li>Hit <em>Submit</em> to save your rating and update the average score.</li>
        <li>We’ll use your ratings to surface better suggestions next time.</li>
      </ul>
    </div>

    <!-- Rating feature — each recipe card has a Rating component -->
    <div v-for="recipe in recipes" :key="recipe.id" class="card p-3 mb-3">
      <h4>{{ recipe.name }}</h4>
      <p>{{ recipe.description }}</p>

      <!--Rating component handles stars, submit, and average display -->
      <Rating :recipeId="recipe.id" />
    </div>
  </div>
</template>
