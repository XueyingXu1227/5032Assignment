<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <Navbar />

  <!-- top region -->
  <header class="bg-light py-5 border-bottom">
    <div class="container">
      <!-- [thematic]  -->
      <h1 class="display-6 fw-bold">Better Living, Beyond Sub-Health</h1>

      <!-- [Project objectives for A1.1]   -->
      <p class="lead mb-0">Together, we make it easier to deal with sub-health challenges.</p>
    </div>
  </header>

  <!-- Main area: responsive layout -->
  <main class="container py-5">
    <div class="row g-4">
      <!-- left Section -->
      <section id="section-a" class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h4 mb-3">Programs</h2>
            <p class="mb-0 text-muted">Discover practical programs to improve daily well-being.</p>
          </div>
        </div>
      </section>

      <!-- right Section -->
      <section id="section-b" class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h4 mb-3">Join</h2>
            <p class="mb-0 text-muted">Join us and take the first step toward better health.</p>
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- bottoms -->
  <footer class="py-4 border-top">
    <div class="container small text-muted">
      <!-- [Copyright Information] -->
      © 2025 NFP Health — Demo for Assignment A1.2
    </div>
  </footer>
</template>

<style>
h1 {
  color: rgb(222, 15, 15);
}
</style>
