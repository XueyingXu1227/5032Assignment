/* simple local queue stored in localStorage */
const KEY = 'offline_queue_v1'

/* read queue safely from localStorage */
function loadQ() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

/* write queue back to localStorage */
function saveQ(q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

/* add a task with id, name, payload, and timestamp */
export function enqueue(name, payload) {
  const q = loadQ()
  q.push({ id: crypto.randomUUID(), name, payload, ts: Date.now() })
  saveQ(q)
}

/* try to process each task; keep failed ones for later */
export async function flush(processor) {
  const q = loadQ()
  const remain = []
  for (const task of q) {
    try {
      await processor(task)
    } catch {
      remain.push(task)
    }
  }
  saveQ(remain)
}

/* check if there are still pending tasks */
export function hasPending() {
  return loadQ().length > 0
}
