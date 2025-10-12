<script setup>
import Navbar from './components/BHeader.vue'
import { useOnline } from '@/composables/useOnline'
const { isOnline } = useOnline()
</script>

<template>
  <div v-if="!isOnline" class="alert alert-warning text-center m-0">
    You are offline — changes will sync when back online.
  </div>
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
