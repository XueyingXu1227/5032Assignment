import { db } from '@/Firebase/init'
import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore'

const PREFIX = 'fit5032_'

function getLS(key, fallback) {
  const raw = localStorage.getItem(PREFIX + key)
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function setLS(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val))
}

export default {
  // --- Recipes & Rating (C.3) ---
  async getRecipes() {
    return getLS('recipes', [])
  },

  // Get current user ratings for a recipe
  async getMyRating(recipeId, userId) {
    const snap = await getDoc(doc(db, 'recipes', recipeId, 'ratings', userId))
    return snap.exists() ? snap.data().score : null
  },

  // Submit ratings (repeat ratings by the same user will overwrite old values)
  async rateRecipe(recipeId, userId, stars) {
    const ref = doc(db, 'recipes', recipeId, 'ratings', userId)
    await setDoc(ref, { score: stars, updatedAt: serverTimestamp() }, { merge: true })
  },

  // Calculation of average score and total number of ratings
  async getRecipeRatingSummary(recipeId) {
    const snaps = await getDocs(collection(db, 'recipes', recipeId, 'ratings'))
    let sum = 0
    let count = 0
    snaps.forEach((docSnap) => {
      const s = docSnap.data().score
      if (typeof s === 'number') {
        sum += s
        count++
      }
    })
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0
    return { avg, count }
  },

  // --- Meal plan (E.4/D.2) ---
  async generateMealPlan(prefs) {
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      prefs,
      items: [
        { title: 'Oats with fruit', minutes: 10 },
        { title: 'Chicken salad', minutes: 15 },
        { title: 'Tofu stir-fry', minutes: 20 },
      ],
    }
  },
  async saveMealPlan(plan) {
    const all = getLS('mealplans', [])
    all.unshift(plan)
    setLS('mealplans', all)
    return plan.id
  },
  async listMealPlans() {
    return getLS('mealplans', [])
  },

  // --- Habitual clocking (F.1/E.4) ---
  async saveHabitEntry(entry) {
    const all = getLS('habits', [])
    all.push(entry)
    setLS('habits', all)
  },
  async getHabitEntries({ from, to } = {}) {
    const all = getLS('habits', [])
    if (!from && !to) return all
    return all.filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
  },

  // --- /learn Two tables of data（D.3） ---
  async getResources() {
    const list = JSON.parse(localStorage.getItem('resources') || '[]')
    if (!list.length) return await this.seedResourcesIfEmpty()
    return list
  },
  async getChallenges() {
    return getLS('challenges', [])
  },

  async seedResourcesIfEmpty() {
    const key = 'resources'
    const cur = JSON.parse(localStorage.getItem(key) || '[]')
    if (cur.length > 0) return cur
    const seed = [
      {
        id: 'r1',
        title: 'What is Sub-health?',
        type: 'Article',
        topic: 'Basics',
        url: 'https://example.com/subhealth',
      },
      {
        id: 'r2',
        title: 'Balanced Diet 101',
        type: 'Article',
        topic: 'Nutrition',
        url: 'https://example.com/diet101',
      },
      {
        id: 'r3',
        title: '10-min Stretching',
        type: 'Video',
        topic: 'Exercise',
        url: 'https://example.com/stretch',
      },
      {
        id: 'r4',
        title: 'Sleep Hygiene Tips',
        type: 'Article',
        topic: 'Sleep',
        url: 'https://example.com/sleep',
      },
      {
        id: 'r5',
        title: 'Low-sugar Breakfast Ideas',
        type: 'Article',
        topic: 'Nutrition',
        url: 'https://example.com/breakfast',
      },
      {
        id: 'r6',
        title: 'Mindful Breathing',
        type: 'Video',
        topic: 'Stress',
        url: 'https://example.com/breath',
      },
      {
        id: 'r7',
        title: 'Hydration Guide',
        type: 'Article',
        topic: 'Basics',
        url: 'https://example.com/water',
      },
      {
        id: 'r8',
        title: 'Home Workout: Beginner',
        type: 'Video',
        topic: 'Exercise',
        url: 'https://example.com/workout',
      },
      {
        id: 'r9',
        title: 'Fiber-rich Foods',
        type: 'Article',
        topic: 'Nutrition',
        url: 'https://example.com/fiber',
      },
      {
        id: 'r10',
        title: 'Understanding BMI',
        type: 'Article',
        topic: 'Basics',
        url: 'https://example.com/bmi',
      },
      {
        id: 'r11',
        title: 'Grocery Label Reading',
        type: 'Article',
        topic: 'Nutrition',
        url: 'https://example.com/label',
      },
    ]
    localStorage.setItem(key, JSON.stringify(seed))
    return seed
  },

  async saveResources(list) {
    localStorage.setItem('resources', JSON.stringify(list || []))
    return true
  },
}
