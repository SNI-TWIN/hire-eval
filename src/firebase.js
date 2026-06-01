import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
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
