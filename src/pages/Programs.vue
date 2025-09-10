<script setup>
import Rating from '@/components/Rating.vue'
import { ref } from 'vue'

const recipes = ref([
  { id: 'recipe1', name: 'Green Salad', description: 'A healthy green salad.' },
  { id: 'recipe2', name: 'Fruit Bowl', description: 'Mixed seasonal fruits.' },
])
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
