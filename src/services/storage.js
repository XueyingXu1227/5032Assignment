import { db } from '@/firebase/init'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'

function requireUid(userId) {
  if (!userId) throw new Error('Not logged in')
  return userId
}

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
    const snap = await getDoc(doc(db, 'recipes', recipeId, 'ratings', userId))
    return snap.exists() ? snap.data().score : null
  },

  async rateRecipe(recipeId, userId, stars) {
    const ref = doc(db, 'recipes', recipeId, 'ratings', userId)
    await setDoc(ref, { score: stars, updatedAt: serverTimestamp() }, { merge: true })
  },

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

  async saveQuizAttempt(attempt, userId) {
    // attempt: { id?, date: 'YYYY-MM-DD', score, total, percent, note }
    const id = attempt.id || crypto.randomUUID()
    const payload = {
      ...attempt,
      id,
      // 额外存一个时间戳，排序方便
      createdAt: serverTimestamp(),
    }

    try {
      const uid = requireUid(userId)
      await setDoc(doc(db, 'users', uid, 'quizAttempts', id), payload, { merge: true })
      // 同步一份到本地当缓存（可选）
      const all = getLS('quizAttempts', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = attempt
      else all.push({ ...attempt, id })
      setLS('quizAttempts', all)
      return id
    } catch (e) {
      // 未登录/离线 → 本地
      const all = getLS('quizAttempts', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = { ...attempt, id }
      else all.push({ ...attempt, id })
      setLS('quizAttempts', all)
      return id
    }
  },

  // 读取测验记录（支持按日期范围；已登录走云端，否则走本地）
  async listQuizAttempts({ from, to } = {}, userId) {
    try {
      const uid = requireUid(userId)

      let q = query(collection(db, 'users', uid, 'quizAttempts'), orderBy('date', 'desc'))
      if (from) q = query(q, where('date', '>=', from))
      if (to) q = query(q, where('date', '<=', to))
      const snaps = await getDocs(q)
      return snaps.docs.map((d) => d.data())
    } catch {
      // 本地回退
      const all = getLS('quizAttempts', [])
      if (!from && !to) return all
      return all.filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    }
  },

  // 首次迁移：把本地 quizAttempts 批量上传到云端（已登录时调用一次）
  async migrateLocalQuizAttempts(userId) {
    const uid = requireUid(userId)
    const all = getLS('quizAttempts', [])
    for (const it of all) {
      const id = it.id || crypto.randomUUID()
      await setDoc(doc(db, 'users', uid, 'quizAttempts', id), { ...it, id }, { merge: true })
    }
    return all.length
  },

  async saveHabitEntry(entry, userId) {
    // entry: { id?, date: 'YYYY-MM-DD', type, minutes, note }
    const id = entry.id || crypto.randomUUID()
    const payload = {
      ...entry,
      id,
      createdAt: serverTimestamp(),
    }

    try {
      const uid = requireUid(userId)
      await setDoc(doc(db, 'users', uid, 'habits', id), payload, { merge: true })
      // 同步一份到本地作为缓存（可选）
      const all = getLS('habits', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = entry
      else all.push({ ...entry, id })
      setLS('habits', all)
      return id
    } catch (e) {
      // 未登录/离线 → 本地
      const all = getLS('habits', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = { ...entry, id }
      else all.push({ ...entry, id })
      setLS('habits', all)
      return id
    }
  },

  async getHabitEntries({ from, to } = {}, userId) {
    try {
      const uid = requireUid(userId)
      let q = query(collection(db, 'users', uid, 'habits'), orderBy('date', 'desc'))
      if (from) q = query(q, where('date', '>=', from))
      if (to) q = query(q, where('date', '<=', to))
      const snaps = await getDocs(q)
      return snaps.docs.map((d) => d.data())
    } catch {
      const all = getLS('habits', [])
      if (!from && !to) return all
      return all.filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    }
  },

  async migrateLocalHabits(userId) {
    const uid = requireUid(userId)
    const all = getLS('habits', [])
    for (const it of all) {
      const id = it.id || crypto.randomUUID()
      await setDoc(doc(db, 'users', uid, 'habits', id), { ...it, id }, { merge: true })
    }
    return all.length
  },

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
