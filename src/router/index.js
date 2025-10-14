import Home from '../pages/Home.vue'
import Signup from '../pages/Signup.vue'
import Programs from '../pages/Programs.vue'
import Quiz from '../pages/Quiz.vue'
import Tracker from '../pages/Tracker.vue'
import Community from '../pages/Community.vue'
import Learn from '../pages/Learn.vue'
import Login from '../pages/Login.vue'
import EmailManagement from '../pages/EmailManagement.vue'
import { createRouter, createWebHistory } from 'vue-router'
import auth from '@/services/auth'
import Map from '../pages/Map.vue'
import AnalyticsView from '../pages/AnalyticsView.vue'
import AdminDashboard from '../pages/AdminDashboard.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/programs', component: Programs },
  { path: '/quiz', name: 'Quiz', component: Quiz },
  { path: '/tracker', name: 'Tracker', component: Tracker },
  { path: '/community', name: 'Community', component: Community },
  { path: '/login', name: 'Login', component: Login },
  { path: '/emailmanagement', component: EmailManagement, meta: { requiresAdmin: true } },
  { path: '/learn', name: 'Learn', component: Learn },
  { path: '/map', name: 'Map', component: Map },
  { path: '/analytics', name: 'Analytics', component: AnalyticsView, meta: { requiresAuth: true } },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  // adding other pages later
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let authReady = false
const waitForAuthReady = new Promise((resolve) => {
  auth.onAuthStateChanged(() => {
    if (!authReady) {
      authReady = true
      resolve()
    }
  })
})

router.beforeEach(async (to, from, next) => {
  if (!authReady) await waitForAuthReady

  const me = auth.getCurrentUser()

  if (to.meta?.requiresAuth && !me) {
    return next('/login')
  }

  if (to.meta?.requiresAdmin) {
    if (!me) return next('/login')
    const role = await auth.getCurrentUserRole()
    if (role !== 'admin') {
      return next('/')
    }
  }

  return next()
})

export default router
