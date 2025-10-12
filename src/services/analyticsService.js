import { db } from '@/firebase/init'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const COL_EVENTS = 'events'
const COL_USERS = 'users'

// ----- Simple Local Cache -----
const cacheSet = (k, v) => localStorage.setItem(k, JSON.stringify({ t: Date.now(), v }))
const cacheGet = (k, maxAgeMs = 5 * 60 * 1000) => {
  try {
    const obj = JSON.parse(localStorage.getItem(k) || 'null')
    if (!obj) return null
    if (Date.now() - obj.t > maxAgeMs) return null
    return obj.v
  } catch {
    return null
  }
}

export async function logEvent(type, extra = {}) {
  const auth = getAuth()
  const uid = auth.currentUser?.uid || null
  try {
    await addDoc(collection(db, COL_EVENTS), {
      type,
      uid,
      createdAt: Timestamp.now(),
      ...extra,
    })
  } catch (e) {
    console.error('❌ logEvent failed:', e)
    throw e
  }
}

export async function getDailySeries(days = 7) {
  const key = `cache:daily:${days}`

  if (!navigator.onLine) {
    const cached = cacheGet(key)
    if (cached) return cached
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const qy = query(
    collection(db, COL_EVENTS),
    where('createdAt', '>=', Timestamp.fromDate(since)),
    orderBy('createdAt', 'asc'),
  )

  const snap = await getDocs(qy)
  const buckets = new Map()

  snap.forEach((doc) => {
    const d = doc.data()
    const date = d.createdAt?.toDate?.().toISOString().slice(0, 10)
    if (!date) return
    if (!buckets.has(date)) {
      buckets.set(date, {
        date,
        habit_update: 0,
        resource_click: 0,
        mealplan_generate: 0,
      })
    }
    const row = buckets.get(date)
    if (d.type && row.hasOwnProperty(d.type)) {
      row[d.type] = (row[d.type] || 0) + 1
    }
  })

  const res = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const keyDate = d.toISOString().slice(0, 10)
    res.push(
      buckets.get(keyDate) || {
        date: keyDate,
        habit_update: 0,
        resource_click: 0,
        mealplan_generate: 0,
      },
    )
  }

  cacheSet(key, res)
  return res
}

export async function getResourceTop(days = 7, topN = 5) {
  const key = `cache:top:${days}`
  if (!navigator.onLine) {
    const cached = cacheGet(key)
    if (cached) return cached
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const qy = query(collection(db, COL_EVENTS), where('createdAt', '>=', Timestamp.fromDate(since)))

  const snap = await getDocs(qy)
  const counter = {}
  snap.forEach((doc) => {
    const d = doc.data()
    if (d.type === 'resource_click' && d.slug) {
      counter[d.slug] = (counter[d.slug] || 0) + 1
    }
  })

  const arr = Object.entries(counter).map(([slug, count]) => ({ slug, count }))
  arr.sort((a, b) => b.count - a.count)

  const res = arr.slice(0, topN)
  cacheSet(key, res)
  return res
}

export async function getKpis(daysForToday = 1) {
  const series = await getDailySeries(daysForToday)
  const today = series.at(-1) || {
    habit_update: 0,
    resource_click: 0,
    mealplan_generate: 0,
  }
  const todayEvents =
    (today.habit_update || 0) + (today.resource_click || 0) + (today.mealplan_generate || 0)

  let totalUsers
  try {
    const snapshot = await getCountFromServer(collection(db, COL_USERS))
    totalUsers = snapshot.data().count
  } catch {}

  return { todayEvents, totalUsers }
}

// ====== Quickly generate demo data ======
export async function seedDemoData() {
  const types = ['habit_update', 'resource_click', 'mealplan_generate']
  const slugs = ['fiber', 'hydration', 'sleep', 'workout', 'mealprep']

  const now = new Date()
  const tasks = []

  for (let i = 0; i < 60; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - Math.floor(Math.random() * 7))
    const type = types[Math.floor(Math.random() * types.length)]
    const payload = {
      createdAt: Timestamp.fromDate(d),
      type,
      uid: getAuth().currentUser?.uid || null,
    }
    if (type === 'resource_click') {
      payload.slug = slugs[Math.floor(Math.random() * slugs.length)]
    }
    tasks.push(addDoc(collection(db, COL_EVENTS), payload))
  }

  await Promise.all(tasks)
}
