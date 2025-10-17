<template>
  <!-- Template Section: Shows a clickable card with title and description -->
  <!-- Used for navigation between feature pages -->
  <router-link :to="link" class="card h-100 text-decoration-none text-dark shadow-sm">
    <div class="card-body text-center">
      <h2 class="card-title">{{ title }}</h2>
      <p class="card-text">{{ description }}</p>
    </div>
  </router-link>
</template>

<script setup>
/* Script Section: Define incoming props for the card component */
defineProps({
  title: String,
  description: String,
  link: String,
})
</script>
