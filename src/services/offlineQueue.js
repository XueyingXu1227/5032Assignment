const KEY = 'offline_queue_v1'

function loadQ() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
function saveQ(q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function enqueue(name, payload) {
  const q = loadQ()
  q.push({ id: crypto.randomUUID(), name, payload, ts: Date.now() })
  saveQ(q)
}

export async function flush(processor) {
  if (!navigator.onLine) return
  const q = loadQ()
  const remain = []
  for (const task of q) {
    try {
      await processor(task)
    } catch (e) {
      remain.push(task)
    }
  }
  saveQ(remain)
}

export function hasPending() {
  return loadQ().length > 0
}
