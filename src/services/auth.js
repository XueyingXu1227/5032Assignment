import { auth, db } from '@/firebase/init'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

async function fetchRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data().role || 'user' : null
}

async function fetchUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export default {
  async signUp(email, password, extra = {}) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid = cred.user.uid
    await setDoc(
      doc(db, 'users', uid),
      {
        email: cred.user.email,
        role: 'user',
        username: extra.username || null,
        createdAt: Date.now(),
      },
      { merge: true },
    )
    return { id: uid, email: cred.user.email, role: 'user' }
  },

  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const uid = cred.user.uid
    const role = (await fetchRole(uid)) || 'user'
    return { id: uid, email: cred.user.email, role }
  },

  async signOut() {
    await fbSignOut(auth)
  },

  getCurrentUser() {
    const u = auth.currentUser
    return u ? { id: u.uid, email: u.email } : null
  },

  async getCurrentUserRole() {
    const u = auth.currentUser
    if (!u) return null
    return await fetchRole(u.uid)
  },

  async getCurrentUserProfile() {
    const u = auth.currentUser
    if (!u) return null
    const data = await fetchUserDoc(u.uid)
    return { id: u.uid, email: u.email, ...(data || {}) } // {id, email, username?, role?}
  },

  onAuthStateChanged(handler) {
    return fbOnAuthStateChanged(auth, handler)
  },
}
