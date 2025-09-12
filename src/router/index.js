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
import UserManagement from '../pages/UserManagement.vue'
import ContentManagement from '../pages/ContentManagement.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/programs', component: Programs },
  { path: '/quiz', name: 'Quiz', component: Quiz },
  { path: '/tracker', name: 'Tracker', component: Tracker },
  { path: '/community', name: 'Community', component: Community },
  { path: '/about', name: 'About', component: About },
  { path: '/login', name: 'Login', component: Login },
  { path: '/user-management', component: UserManagement, meta: { requiresAdmin: true } },
  { path: '/content-management', component: ContentManagement, meta: { requiresAdmin: true } },
  // adding other pages later
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta?.requiresAdmin) {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u || u.role !== 'admin') return next('/login')
  }
  next()
})

export default router
