import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

const COLECCION_BORRADOS = 'cloudinary_borrados_pendientes'

/**
 * Registra un public_id huérfano de Cloudinary en Firestore.
 * Estructura: { publicId, origen, fecha }
 *
 * @param {string} publicId - ID público del asset en Cloudinary
 * @param {string} origen - Identificador del origen (ej: 'productos', 'categorias', 'rubros')
 * @returns {Promise<string|null>}
 */
export async function registrarPublicIdHuerfano(publicId, origen = 'desconocido') {
  if (!publicId || typeof publicId !== 'string' || !publicId.trim()) return null
  const cleanId = publicId.trim()

  if (!isFirebaseConfigured || !db) {
    console.warn('[Cloudinary Borrados] Firebase no disponible, no se pudo registrar huérfano:', cleanId)
    return null
  }

  try {
    const docRef = await addDoc(collection(db, COLECCION_BORRADOS), {
      publicId: cleanId,
      origen,
      fecha: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.warn('[Cloudinary Borrados] Error registrando huérfano:', error)
    return null
  }
}
