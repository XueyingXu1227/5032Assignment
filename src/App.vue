<script setup>
import Navbar from './components/BHeader.vue'
import { useOnline } from '@/composables/useOnline'
import Footer from './components/Footer.vue'

const { isOnline } = useOnline()
</script>

<!-- src/App.vue -->
<template>
  <!-- Skip link: Tab  -->
  <a href="#main" class="skip-link">Skip to main content</a>

  <header>
    <nav aria-label="Main">
      <Navbar />
    </nav>
  </header>

  <!-- main content -->
  <main id="main" tabindex="-1">
    <RouterView />
  </main>

  <!-- Screen readers for broadcasting -->
  <div id="sr-updates" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>

  <Footer />
</template>

<style>
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  background: #fff;
  border: 2px solid #000;
  padding: 0.5rem 1rem;
  z-index: 10000;
}

:focus-visible {
  outline: 3px solid #0d6efd;
  outline-offset: 2px;
}

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: 0;
}

.btn-outline-primary {
  color: #004085 !important;
  border-color: #004085 !important;
}
.btn-outline-primary:hover {
  background-color: #004085 !important;
  color: #fff !important;
}

.alert-info {
  background-color: #d1ecf1 !important;
  color: #084c61 !important;
}
</style>
