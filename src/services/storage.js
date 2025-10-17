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
// —— 本地 habit 缓存工具 ——
// 说明：每个用户一个 key：habits_<uid>
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
//按 id 删除本地 quiz 条目（用于把“临时”换成“正式”）
function removeLocalQuizById(uid, id) {
  const key = `quiz_${uid}`
  const list = getLS(key, []) || []
  const next = list.filter((x) => x.id !== id)
  setLS(key, next)
  return next
}

// —— 读取：本地优先，在线时再合并云端 ——
// 调用：getHabitEntries({from,to}, uid)
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

// —— 新增：先本地立即可见，再写云或入队 ——
// 调用：addHabitEntry(entry, uid)
async function addHabitEntry(entry, uid) {
  const item = {
    id: crypto.randomUUID(), // 本地临时 id
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
      enqueue('habit_sync', { uid, item })
    }
  } else {
    enqueue('habit_sync', { uid, item })
  }
  return item
}

// —— 队列任务的执行器：把 pending 写上云端 ——
// 调用：syncHabitTask({ uid, item })
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
// —— 读取 Quiz：本地优先，在线时合并云端 ——
// 调用：getQuizResults({from,to}, uid)
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

// —— 新增 Quiz：先本地立即可见，再写云或入队 ——
// 返回：离线时返回 pending 的临时对象；在线成功时返回已替换过 id 的正式对象
async function addQuizResult(entry, uid) {
  // 1) 先生成并写入“临时记录”（pending=true）
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

  // 2) 在线：写云端成功后，删除临时记录，再写正式记录
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
      // 在线失败就入队，返回临时对象
      enqueue('quiz_sync', { uid, item: temp })
      return temp
    }
  }

  // 3) 离线：入队，返回临时对象
  enqueue('quiz_sync', { uid, item: temp })
  return temp
}

// —— 队列执行器：把 pending 的 Quiz 写到云端，并用正式 id 替换本地临时 id
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

  // 关键：用云端 id 替换本地临时 id
  removeLocalQuizById(uid, item.id)
  upsertLocalQuiz(uid, fixed)
}

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
  getHabitEntries,
  addHabitEntry,
  syncHabitTask,
  getQuizResults,
  addQuizResult,
  syncQuizTask,
}
