// BR (D.1)：External Authentication — connect app to Firebase Auth
// BR (E.1)：Cloud Functions / Firestore — connect app to Firestore database
// BR (F.1)：Offline feature — enable IndexedDB persistence for offline data use

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

// Firebase config values stored in .env for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
// Init firebase app
const app = initializeApp(firebaseConfig)
// Auth and Firestore used in other parts of the app
export const auth = getAuth(app)
export const db = getFirestore(app)
// BR (F.1)：Offline feature — keep Firestore data when user is offline
enableIndexedDbPersistence(db).catch(() => {})
