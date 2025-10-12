import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyARiaP1xsXZ_utesU9qQwGzSj5Fgg0dDXs',
  authDomain: 'fit5032assessment-xu.firebaseapp.com',
  projectId: 'fit5032assessment-xu',
  storageBucket: 'fit5032assessment-xu.firebasestorage.app',
  messagingSenderId: '116365047713',
  appId: '1:116365047713:web:415e9e25e3ae5ac903bde0',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
