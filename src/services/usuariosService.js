import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as authSignOut,
  updatePassword as authUpdatePassword,
} from 'firebase/auth'
import { app as mainApp, db, isFirebaseConfigured } from '../lib/firebase.js'

// Configuración de Firebase para la instancia secundaria de Auth
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_API_KEY : ''),
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_AUTH_DOMAIN : ''),
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_PROJECT_ID : ''),
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_STORAGE_BUCKET : ''),
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID : ''),
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_APP_ID : ''),
}

/**
 * Obtener todos los usuarios de la colección 'usuarios' (colección única del sistema)
 */
export async function getUsuarios() {
  if (!isFirebaseConfigured || !db) {
    return []
  }
  try {
    const querySnapshot = await getDocs(collection(db, 'usuarios'))
    const usuarios = []
    querySnapshot.forEach((docSnap) => {
      usuarios.push({
        id: docSnap.id,
        uid: docSnap.id,
        ...docSnap.data(),
      })
    })
    return usuarios
  } catch (error) {
    console.error('[usuariosService] Error al obtener lista de usuarios de Firestore:', error)
    throw error
  }
}

/**
 * Obtener perfil de un usuario por su UID (o fallback por email) en la colección 'usuarios'
 */
export async function getUsuarioByUid(uid, email = null) {
  if (!isFirebaseConfigured || !db || (!uid && !email)) {
    return null
  }
  try {
    // 1. Buscar por UID (ID estándar de Auth)
    if (uid) {
      const docRef = doc(db, 'usuarios', uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { id: docSnap.id, uid: docSnap.id, ...docSnap.data() }
      }
    }

    // 2. Fallback: buscar por ID = email si se guardó con el email como ID
    const targetEmail = email ? email.trim().toLowerCase() : (uid?.includes('@') ? uid.trim().toLowerCase() : null)
    if (targetEmail) {
      const docRefEmail = doc(db, 'usuarios', targetEmail)
      const docSnapEmail = await getDoc(docRefEmail)
      if (docSnapEmail.exists()) {
        return { id: docSnapEmail.id, uid: docSnapEmail.id, ...docSnapEmail.data() }
      }

      // 3. Fallback: consulta por campo 'email'
      const q = query(collection(db, 'usuarios'), where('email', '==', targetEmail))
      const querySnap = await getDocs(q)
      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0]
        return { id: firstDoc.id, uid: firstDoc.id, ...firstDoc.data() }
      }
    }

    return null
  } catch (error) {
    console.warn(`[usuariosService] Advertencia al obtener usuario ${uid}:`, error)
    return null
  }
}

/**
 * Verificar si un email ya existe en la colección de usuarios
 */
export async function checkEmailExists(email) {
  if (!isFirebaseConfigured || !db || !email) return false
  const cleanEmail = email.trim().toLowerCase()
  try {
    const q = query(collection(db, 'usuarios'), where('email', '==', cleanEmail))
    const snap = await getDocs(q)
    return !snap.empty
  } catch (err) {
    console.warn('[usuariosService] Advertencia al verificar existencia de email:', err)
    return false
  }
}

/**
 * Cambiar el estado de un usuario (activo <-> deshabilitado) en la colección 'usuarios'
 */
export async function toggleUsuarioStatus(uid, currentStatus) {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error('Firebase no está configurado o UID inválido')
  }
  const newStatus = currentStatus === 'deshabilitado' ? 'activo' : 'deshabilitado'
  const updatedAt = new Date().toISOString()

  try {
    const userRef = doc(db, 'usuarios', uid)
    await setDoc(userRef, { status: newStatus, updatedAt }, { merge: true })
    return newStatus
  } catch (error) {
    console.error(`[usuariosService] Error al actualizar estado de ${uid}:`, error)
    throw error
  }
}

/**
 * Generar contraseña temporal aleatoria (10 caracteres)
 */
export function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Dar de alta un usuario utilizando el patrón de instancia secundaria de Firebase Auth.
 * Escribe directamente en la colección existente 'usuarios' con el UID como ID de documento.
 */
export async function crearUsuarioSecundario({ email, rol }) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase no está configurado.')
  }

  const cleanEmail = email.trim().toLowerCase()
  const tempPassword = generateRandomPassword()

  // Nombre único para la app secundaria
  const appName = `secondary_app_${Date.now()}`
  let secondaryApp = null

  try {
    secondaryApp = initializeApp(firebaseConfig, appName)
    const secondaryAuth = getAuth(secondaryApp)

    // 1. Crear usuario en Firebase Auth con la contraseña temporal
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, tempPassword)
    const newUid = userCredential.user.uid

    // 2. Crear documento en la colección única 'usuarios' con ID = newUid
    const userDocData = {
      nombre: cleanEmail.split('@')[0],
      email: cleanEmail,
      rol: rol || 'admin',
      status: 'activo',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await setDoc(doc(db, 'usuarios', newUid), userDocData)

    // 3. Enviar correo de restablecimiento de contraseña vía Firebase Auth
    try {
      await sendPasswordResetEmail(secondaryAuth, cleanEmail)
    } catch (resetErr) {
      console.warn('[usuariosService] Advertencia al enviar sendPasswordResetEmail:', resetErr)
    }

    // 4. Cerrar sesión en la instancia secundaria
    await authSignOut(secondaryAuth)

    return {
      uid: newUid,
      email: cleanEmail,
      rol,
      tempPassword,
    }
  } catch (error) {
    console.error('[usuariosService] Error al crear usuario secundario:', error)
    throw error
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp)
      } catch (delErr) {
        // Ignorar
      }
    }
  }
}

/**
 * Actualizar contraseña obligatoria en el primer ingreso.
 * Actualiza la clave en Firebase Auth y cambia mustChangePassword = false en la colección 'usuarios'
 * para el documento del usuario logueado.
 */
export async function cambiarPasswordPrimerIngreso(newPassword) {
  const auth = getAuth(mainApp)
  if (!auth.currentUser) {
    throw new Error('No hay una sesión activa para cambiar la contraseña.')
  }

  const currentUser = auth.currentUser
  const uid = currentUser.uid
  const cleanEmail = currentUser.email?.trim().toLowerCase()

  // 1. Actualizar contraseña en Firebase Auth
  await authUpdatePassword(currentUser, newPassword)

  // 2. Actualizar mustChangePassword = false en Firestore en la colección 'usuarios'
  const updatedAt = new Date().toISOString()
  const updateData = {
    mustChangePassword: false,
    updatedAt,
  }

  // Actualizar por UID
  const userRefByUid = doc(db, 'usuarios', uid)
  await setDoc(userRefByUid, updateData, { merge: true })

  // Si existe un documento histórico cuyo ID es el email, actualizarlo también
  if (cleanEmail && cleanEmail !== uid) {
    try {
      const userRefByEmail = doc(db, 'usuarios', cleanEmail)
      const snapEmail = await getDoc(userRefByEmail)
      if (snapEmail.exists()) {
        await setDoc(userRefByEmail, updateData, { merge: true })
      }
    } catch (e) {
      // Ignorar si no existe
    }
  }
}

/**
 * Seed o asignación de rol 'superadmin' / 'SADMIN' a un usuario por su email o UID en la colección 'usuarios'
 */
export async function seedSuperAdmin(emailOrUid, email = '') {
  if (!isFirebaseConfigured || !db) return

  let uid = emailOrUid
  let targetEmail = email || emailOrUid

  if (targetEmail.includes('@') && !uid.match(/^[a-zA-Z0-9]{28}$/)) {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', targetEmail.trim().toLowerCase()))
      const snap = await getDocs(q)
      if (!snap.empty) {
        uid = snap.docs[0].id
      }
    } catch (e) {
      // Ignorar
    }
  }

  const userDocData = {
    nombre: targetEmail.split('@')[0],
    email: targetEmail.trim().toLowerCase(),
    rol: 'SADMIN',
    status: 'activo',
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  }

  if (uid) {
    try {
      await setDoc(doc(db, 'usuarios', uid), userDocData, { merge: true })
      console.info(`[usuariosService] Asignado rol SADMIN a usuario ${targetEmail} (UID: ${uid})`)
    } catch (err) {
      console.warn(`[usuariosService] No se pudo guardar el doc SADMIN en Firestore:`, err)
    }
  }
}
