import { normalizeUsername, sha256 } from '@/utils/security'

const LS_CURRENT = 'user'
const LS_ADMIN = 'admin'

function readCurrent() {
  const raw = localStorage.getItem(LS_CURRENT)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function writeCurrent(u) {
  if (!u) localStorage.removeItem(LS_CURRENT)
  else localStorage.setItem(LS_CURRENT, JSON.stringify(u))
}

async function ensureAdminSeed() {
  if (!localStorage.getItem(LS_ADMIN)) {
    const adminHash = await sha256('admin123')
    localStorage.setItem(
      LS_ADMIN,
      JSON.stringify({
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
      }),
    )
  }
}

export default {
  async signUp(username, password) {
    await ensureAdminSeed()
    const safe = normalizeUsername(username)
    const key = `user:${safe}`
    const exists = localStorage.getItem(key)
    if (exists) {
      const err = new Error('user exists')
      err.code = 'USER_EXISTS'
      throw err
    }
    const hash = await sha256(password)
    const user = { username: safe, passwordHash: hash, role: 'user' }
    localStorage.setItem(key, JSON.stringify(user))
    return { id: safe, username: safe, role: 'user' }
  },

  async signIn(username, password) {
    await ensureAdminSeed()
    const safe = normalizeUsername(username)
    const admin = JSON.parse(localStorage.getItem(LS_ADMIN) || 'null')
    const user = JSON.parse(localStorage.getItem(`user:${safe}`) || 'null')
    const inputHash = await sha256(password)

    let current = null
    if (admin && safe === admin.username && inputHash === admin.passwordHash) {
      current = { username: admin.username, role: 'admin' }
    } else if (user && inputHash === user.passwordHash) {
      current = { username: user.username, role: user.role || 'user' }
    }

    if (!current) {
      const err = new Error('login failed')
      err.code = !user && safe !== 'admin' ? 'USER_NOT_FOUND' : 'WRONG_PASSWORD'
      throw err
    }

    writeCurrent(current)
    return { id: current.username, username: current.username, role: current.role }
  },

  async signOut() {
    writeCurrent(null)
  },

  getCurrentUser() {
    const u = readCurrent()
    return u ? { id: u.username, username: u.username, role: u.role } : null
  },

  getCurrentUserRole() {
    const u = readCurrent()
    return u?.role ?? null
  },
}
