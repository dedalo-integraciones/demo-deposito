import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_API_KEY : '') || 'AIzaSyDMQlq7HFg9p-d9Z1l1OqC-9ZWS-UOGvYE',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_AUTH_DOMAIN : '') || 'deposito-bombal.firebaseapp.com',
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_PROJECT_ID : '') || 'deposito-bombal',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_STORAGE_BUCKET : '') || 'deposito-bombal.firebasestorage.app',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '') || '835803481928',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_APP_ID : '') || '1:835803481928:web:70618464281cdbf58b157d',
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every((v) => Boolean(v))

let app = null, db = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  // Configuración de transporte para evitar cierres de canal por timeout en WebChannel (Listen/channel net::ERR_TIMED_OUT)
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  })
  console.info('[Firebase] Conexión inicializada con éxito (isFirebaseConfigured: true)')
} else {
  console.warn('[Firebase] Falta .env — la app corre en modo demo hasta cargar las claves.')
}

export { app, db }

