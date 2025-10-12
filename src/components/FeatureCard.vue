<template>
  <router-link :to="link" class="card h-100 text-decoration-none text-dark shadow-sm">
    <div class="card-body text-center">
      <h5 class="card-title">{{ title }}</h5>
      <p class="card-text">{{ description }}</p>
    </div>
  </router-link>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  link: String,
})
</script>
