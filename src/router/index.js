// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Signup from '../pages/Signup.vue'
import Programs from '../pages/Programs.vue'
import Quiz from '../pages/Quiz.vue'
import Tracker from '../pages/Tracker.vue'
import Community from '../pages/Community.vue'
import About from '../pages/About.vue'
import Login from '../pages/Login.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/programs', component: Programs },
  { path: '/quiz', name: 'Quiz', component: Quiz },
  { path: '/tracker', name: 'Tracker', component: Tracker },
  { path: '/community', name: 'Community', component: Community },
  { path: '/about', name: 'About', component: About },
  { path: '/login', name: 'Login', component: Login },
  // adding other pages later
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
