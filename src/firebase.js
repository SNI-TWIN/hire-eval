import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: "AIzaSyB02QKfKp466qopS7AE7leQs-u6os43vV8",
  authDomain: "hr-portal-eefc1.firebaseapp.com",
  projectId: "hr-portal-eefc1",
  storageBucket: "hr-portal-eefc1.firebasestorage.app",
  messagingSenderId: "585071959656",
  appId: "1:585071959656:web:e3324ae92c2d5f9684e5dd"
};

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// 로그인 세션을 탭 세션으로만 유지 — 창/탭을 닫으면 로그아웃되어 재로그인 필요(급여 데이터 보호).
// 같은 탭에서 새로고침(F5)은 유지되고, 창을 닫으면 풀림. 실패해도 앱 동작엔 지장 없도록 무시.
setPersistence(auth, browserSessionPersistence).catch(() => {})
