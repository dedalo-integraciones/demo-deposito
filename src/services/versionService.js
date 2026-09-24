import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase.js'

const VERSION_COLLECTION = 'meta'
const VERSION_DOC = 'catalogoVersion'

/**
 * Obtiene la versión actual del catálogo desde Firestore (meta/catalogoVersion).
 * @returns {Promise<string|number|null>} Versión (timestamp/string) o null
 */
export async function getCatalogoVersionFirestore() {
  if (!isFirebaseConfigured || !db) return null

  try {
    const docRef = doc(db, VERSION_COLLECTION, VERSION_DOC)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    // data.version puede ser número, timestamp o Date convertido
    if (data?.version) {
      if (typeof data.version === 'number' || typeof data.version === 'string') {
        return String(data.version)
      }
      if (data.version.toMillis) {
        return String(data.version.toMillis())
      }
    }
    return null
  } catch (error) {
    console.warn('[versionService] Error al obtener meta/catalogoVersion:', error)
    throw error
  }
}

/**
 * Actualiza la versión del catálogo en Firestore (meta/catalogoVersion) con el timestamp actual.
 * Debe invocarse en cada escritura (alta, modificación, cambio de estado) en productos, categorías y rubros.
 */
export async function bumpCatalogoVersion() {
  if (!isFirebaseConfigured || !db) return

  try {
    const docRef = doc(db, VERSION_COLLECTION, VERSION_DOC)
    const nowTimestamp = Date.now()
    await setDoc(docRef, {
      version: nowTimestamp,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    console.warn('[versionService] No se pudo actualizar meta/catalogoVersion (requiere sesión admin):', error?.message || error)
  }
}
