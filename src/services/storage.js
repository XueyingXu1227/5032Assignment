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
  async getRecipes() {
    return getLS('recipes', [])
  },
  async getMyRating(recipeId, userId) {
    const all = getLS('ratings', {})
    return all[recipeId]?.[userId] ?? null
  },
  async rateRecipe(recipeId, userId, stars) {
    const all = getLS('ratings', {})
    all[recipeId] = all[recipeId] || {}
    all[recipeId][userId] = stars
    setLS('ratings', all)
  },
  async getRecipeRatingSummary(recipeId) {
    const all = getLS('ratings', {})
    const map = all[recipeId] || {}
    const vals = Object.values(map)
    if (!vals.length) return { avg: 0, count: 0 }
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    return { avg, count: vals.length }
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
    return getLS('resources', [])
  },
  async getChallenges() {
    return getLS('challenges', [])
  },
}
