<script setup>
import Navbar from './components/Navbar.vue'
import Join from './components/Join.vue'

// Dynamic data + local storage
import { ref, watch } from 'vue'

const STORAGE_KEY = 'diet_prefs_v1'

// First load: restore from localStorage first; if not, give three default examples
const defaultPrefs = [
  { id: 1, title: 'Mindful Breathing', note: 'Take 5 slow breaths when you feel stressed.' },
  { id: 2, title: 'Short Walk', note: 'Take a 10-minute walk after meals.' },
  { id: 3, title: 'Water Reminder', note: 'Drink a glass of water every 2-3 hours.' },
]
const prefs = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultPrefs)

// Input Box Model
const newPref = ref({ title: '', note: '' })

// Add a Tip
const addPref = () => {
  const t = newPref.value.title.trim()
  const n = newPref.value.note.trim()
  if (!t) return
  prefs.value.push({ id: Date.now(), title: t, note: n })
  newPref.value = { title: '', note: '' }
}

// Delete a tip
const removePref = (id) => {
  prefs.value = prefs.value.filter((p) => p.id !== id)
}

//Listens to changes in the tips array and saves them to localStorage as soon as they are added or deleted.
watch(
  prefs,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  { deep: true },
)
</script>

<template>
  <Navbar />

  <!-- top region -->
  <header class="bg-light py-5 border-bottom">
    <div class="container-xxl">
      <!-- [thematic]  -->
      <h1 class="display-6 fw-bold">Better Living, Beyond Sub-Health</h1>

      <!-- [Project objectives for A1.1]   -->
      <p class="lead mb-0">Together, we make it easier to deal with sub-health challenges.</p>
    </div>
  </header>

  <!-- Main area: responsive layout -->
  <main class="container-xxl py-5">
    <div class="row g-4">
      <!-- left Section -->
      <section id="section-a" class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h4 mb-3">Health tips</h2>

            <!-- Add a Tip -->
            <div class="row g-2 align-items-end mb-3 flex-xl-nowrap">
              <div class="col-12 col-xl-5">
                <label class="form-label small">Title</label>
                <input
                  class="form-control"
                  v-model.trim="newPref.title"
                  placeholder="e.g., Better Sleep"
                />
              </div>
              <div class="col-12 col-md-5">
                <label class="form-label small">Details (optional)</label>
                <input class="form-control" v-model.trim="newPref.note" placeholder="Short note" />
              </div>
              <div class="col-12 col-xl-auto d-grid">
                <button class="btn btn-primary text-nowrap" @click="addPref">Add</button>
              </div>
            </div>

            <!-- Generate cards from prefs array -->
            <div class="row g-3">
              <div class="col-12" v-for="p in prefs" :key="p.id">
                <div class="card shadow-sm">
                  <div class="card-body d-flex justify-content-between align-items-start">
                    <div class="pe-3">
                      <h5 class="card-title mb-1">{{ p.title }}</h5>
                      <p class="card-text text-muted mb-0" v-if="p.note">{{ p.note }}</p>
                    </div>
                    <button class="btn btn-outline-danger btn-sm" @click="removePref(p.id)">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- right Section -->
      <section id="section-b" class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h4 mb-3">Join</h2>
            <Join />
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- bottoms -->
  <footer class="py-4 border-top">
    <div class="container-xxl small text-muted">
      <!-- [Copyright Information] -->
      © 2025 NFP Health — Demo for Assignment A1.2 - 34657762
    </div>
  </footer>
</template>

<style>
h1 {
  color: rgb(222, 15, 15);
}
</style>
