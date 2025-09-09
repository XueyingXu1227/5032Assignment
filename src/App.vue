<script setup>
import Navbar from './components/BHeader.vue'
</script>

<template>
  <div id="app">
    <Navbar />
    <router-view />
  </div>
</template>

<style scoped>
h1 {
  color: rgb(222, 15, 15);
}
</style>
