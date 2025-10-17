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
import { enqueue } from '@/services/offlineQueue'

/* Offline-first cache : local helpers for habits/quiz per user */
// local habit cache: key = habits_<uid>
function upsertLocalHabit(uid, item) {
  const key = `habits_${uid}`
  const list = getLS(key, []) || []
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  setLS(key, list)
  return list
}
function readLocalHabits(uid) {
  return getLS(`habits_${uid}`, []) || []
}
function upsertLocalQuiz(uid, item) {
  const key = `quiz_${uid}`
  const list = getLS(key, []) || []
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  setLS(key, list)
  return list
}
function readLocalQuiz(uid) {
  return getLS(`quiz_${uid}`, []) || []
}
/* Replace temp quiz with confirmed one (by id) */
function removeLocalQuizById(uid, id) {
  const key = `quiz_${uid}`
  const list = getLS(key, []) || []
  const next = list.filter((x) => x.id !== id)
  setLS(key, next)
  return next
}

/* local-first; merge cloud when online */
// use: getHabitEntries({from,to}, uid)
async function getHabitEntries({ from, to }, uid) {
  const local = readLocalHabits(uid)
    .filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  if (navigator.onLine) {
    try {
      const col = collection(db, 'users', uid, 'habits')
      const q = query(
        col,
        where('date', '>=', from),
        where('date', '<=', to),
        orderBy('date', 'desc'),
      )
      const snap = await getDocs(q)
      const cloud = snap.docs.map((d) => ({ id: d.id, ...d.data(), pending: false }))
      //merge cloud over local by id
      const mergedMap = new Map()
      ;[...cloud, ...local].forEach((item) => mergedMap.set(item.id, item))
      const merged = Array.from(mergedMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
      setLS(`habits_${uid}`, merged)
      return merged
    } catch {
      return local
    }
  }
  return local
}

/* show instantly (pending when offline), sync later */
// use: addHabitEntry(entry, uid)
async function addHabitEntry(entry, uid) {
  const item = {
    id: crypto.randomUUID(), // local temp id
    date: entry.date,
    type: entry.type,
    minutes: Number(entry.minutes) || 0,
    note: entry.note || '',
    pending: !navigator.onLine,
    createdAt: Date.now(),
  }
  upsertLocalHabit(uid, item)

  if (navigator.onLine) {
    try {
      const col = collection(db, 'users', uid, 'habits')
      const docRef = await addDoc(col, {
        date: item.date,
        type: item.type,
        minutes: item.minutes,
        note: item.note || '',
        createdAt: serverTimestamp(),
      })
      item.id = docRef.id
      item.pending = false
      upsertLocalHabit(uid, item)
    } catch {
      // BR (F.1): queue for later sync
      enqueue('habit_sync', { uid, item })
    }
  } else {
    enqueue('habit_sync', { uid, item })
  }
  return item
}

/* write pending habit to cloud */
// use: syncHabitTask({ uid, item })
async function syncHabitTask({ uid, item }) {
  const col = collection(db, 'users', uid, 'habits')
  const docRef = await addDoc(col, {
    date: item.date,
    type: item.type,
    minutes: item.minutes,
    note: item.note || '',
    createdAt: serverTimestamp(),
  })
  const fixed = { ...item, id: docRef.id, pending: false }
  upsertLocalHabit(uid, fixed)
}

/* Read quiz results: local-first; merge cloud when online */
// use: getQuizResults({from,to}, uid)
async function getQuizResults({ from, to }, uid) {
  const local = readLocalQuiz(uid)
    .filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  if (navigator.onLine) {
    try {
      const col = collection(db, 'users', uid, 'quizResults')
      const qy = query(
        col,
        where('date', '>=', from),
        where('date', '<=', to),
        orderBy('date', 'desc'),
      )
      const snap = await getDocs(qy)
      const cloud = snap.docs.map((d) => ({ id: d.id, ...d.data(), pending: false }))
      //merge by id (cloud wins)
      const merged = Array.from(new Map([...cloud, ...local].map((it) => [it.id, it])))
        .map(([, v]) => v)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      setLS(`quiz_${uid}`, merged)
      return merged
    } catch {
      return local
    }
  }
  return local
}

/* temp row shown immediately; swap to confirmed on success */
// returns: temp when offline; confirmed with cloud id when online
async function addQuizResult(entry, uid) {
  // 1) create temp (pending=true)
  const temp = {
    id: crypto.randomUUID(),
    date: entry.date,
    score: Number(entry.score) || 0,
    total: Number(entry.total) || 0,
    note: entry.note || '',
    pending: !navigator.onLine,
    createdAt: Date.now(),
  }
  upsertLocalQuiz(uid, temp)

  // 2) online path: write, then replace temp with confirmed
  if (navigator.onLine) {
    try {
      const col = collection(db, 'users', uid, 'quizResults')
      const docRef = await addDoc(col, {
        date: temp.date,
        score: temp.score,
        total: temp.total,
        note: temp.note,
        createdAt: serverTimestamp(),
      })
      const fixed = { ...temp, id: docRef.id, pending: false }
      removeLocalQuizById(uid, temp.id)
      upsertLocalQuiz(uid, fixed)
      return fixed
    } catch {
      // online failed → queue and return temp
      enqueue('quiz_sync', { uid, item: temp })
      return temp
    }
  }

  // 3) offline: queue and return temp
  enqueue('quiz_sync', { uid, item: temp })
  return temp
}

/* Queue processor : write pending quiz, swap temp id -> cloud id */
async function syncQuizTask({ uid, item }) {
  const col = collection(db, 'users', uid, 'quizResults')
  const docRef = await addDoc(col, {
    date: item.date,
    score: item.score,
    total: item.total,
    note: item.note,
    createdAt: serverTimestamp(),
  })
  const fixed = { ...item, id: docRef.id, pending: false }
  // important: replace local temp by real id
  removeLocalQuizById(uid, item.id)
  upsertLocalQuiz(uid, fixed)
}

/* throw if not logged in */
function requireUid(userId) {
  if (!userId) throw new Error('Not logged in')
  return userId
}

/*  Local storage helpers with a common prefix */
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
  /*read from local cache */
  async getRecipes() {
    return getLS('recipes', [])
  },

  /* read my rating for a recipe */
  async getMyRating(recipeId, userId) {
    const snap = await getDoc(doc(db, 'recipes', recipeId, 'ratings', userId))
    return snap.exists() ? snap.data().score : null
  },

  /* upsert rating with server timestamp */
  async rateRecipe(recipeId, userId, stars) {
    const ref = doc(db, 'recipes', recipeId, 'ratings', userId)
    await setDoc(ref, { score: stars, updatedAt: serverTimestamp() }, { merge: true })
  },

  /* Ratings summary — avg and count */
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

  /*  simple meal plan generator (local only) */
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

  /* save to cloud if logged in, else fallback local */
  async saveQuizAttempt(attempt, userId) {
    // attempt: { id?, date: 'YYYY-MM-DD', score, total, percent, note }
    const id = attempt.id || crypto.randomUUID()
    const payload = {
      ...attempt,
      id,
      // extra ts for ordering
      createdAt: serverTimestamp(),
    }

    try {
      const uid = requireUid(userId)
      await setDoc(doc(db, 'users', uid, 'quizAttempts', id), payload, { merge: true })
      // mirror to local cache
      const all = getLS('quizAttempts', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = attempt
      else all.push({ ...attempt, id })
      setLS('quizAttempts', all)
      return id
    } catch (e) {
      // not logged in/offline → local
      const all = getLS('quizAttempts', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = { ...attempt, id }
      else all.push({ ...attempt, id })
      setLS('quizAttempts', all)
      return id
    }
  },

  /*Quiz attempts :list by range; cloud if possible, local fallback */
  async listQuizAttempts({ from, to } = {}, userId) {
    try {
      const uid = requireUid(userId)

      let q = query(collection(db, 'users', uid, 'quizAttempts'), orderBy('date', 'desc'))
      if (from) q = query(q, where('date', '>=', from))
      if (to) q = query(q, where('date', '<=', to))
      const snaps = await getDocs(q)
      return snaps.docs.map((d) => d.data())
    } catch {
      // local fallback
      const all = getLS('quizAttempts', [])
      if (!from && !to) return all
      return all.filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    }
  },

  /* One-time migration : push local quizAttempts to cloud after login */
  async migrateLocalQuizAttempts(userId) {
    const uid = requireUid(userId)
    const all = getLS('quizAttempts', [])
    for (const it of all) {
      const id = it.id || crypto.randomUUID()
      await setDoc(doc(db, 'users', uid, 'quizAttempts', id), { ...it, id }, { merge: true })
    }
    return all.length
  },

  /*  Habits: save cloud if logged in, else local fallback */
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
      // mirror to local cache
      const all = getLS('habits', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = entry
      else all.push({ ...entry, id })
      setLS('habits', all)
      return id
    } catch (e) {
      // not logged in/offline → local
      const all = getLS('habits', [])
      const idx = all.findIndex((x) => x.id === id)
      if (idx >= 0) all[idx] = { ...entry, id }
      else all.push({ ...entry, id })
      setLS('habits', all)
      return id
    }
  },

  /* list by range with cloud preferred, local fallback */
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

  /* push local habits to cloud after login */
  async migrateLocalHabits(userId) {
    const uid = requireUid(userId)
    const all = getLS('habits', [])
    for (const it of all) {
      const id = it.id || crypto.randomUUID()
      await setDoc(doc(db, 'users', uid, 'habits', id), { ...it, id }, { merge: true })
    }
    return all.length
  },

  /* local list (seed if empty) */
  async getResources() {
    const list = JSON.parse(localStorage.getItem('resources') || '[]')
    if (!list.length) return await this.seedResourcesIfEmpty()
    return list
  },
  async getChallenges() {
    return getLS('challenges', [])
  },

  /* first-time demo data */
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

  /* Save resources list to local storage */
  async saveResources(list) {
    localStorage.setItem('resources', JSON.stringify(list || []))
    return true
  },

  // expose offline-first helpers for other modules
  getHabitEntries,
  addHabitEntry,
  syncHabitTask,
  getQuizResults,
  addQuizResult,
  syncQuizTask,
}
