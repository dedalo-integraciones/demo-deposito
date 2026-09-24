import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase.js'
import { bumpCatalogoVersion } from './versionService.js'

const COLLECTION_NAME = 'rubros'

/**
 * Obtiene todos los rubros activos filtrados por activo == true.
 * El ordenamiento por descripción se realiza en cliente (v1).
 * @returns {Promise<Array>} Array de rubros activos [{ id, descripcion, activo, imagen }, ...]
 */
export async function getRubrosActivos() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[rubrosService] Firebase no configurado')
    return []
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('activo', '==', true)
    )

    const snapshot = await getDocs(q)
    const rubros = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    // Ordenamiento en cliente por descripción (A-Z)
    return rubros.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[rubrosService] Error al obtener rubros activos:', error)
    throw error
  }
}

/**
 * Obtiene todos los rubros (activos e inactivos) para el panel de administración.
 * @returns {Promise<Array>}
 */
export async function getAllRubros() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[rubrosService] Firebase no configurado')
    return []
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const rubros = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    return rubros.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[rubrosService] Error al obtener todos los rubros:', error)
    throw error
  }
}

/**
 * Obtiene un rubro por su ID de documento.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getRubroById(id) {
  if (!isFirebaseConfigured || !db || !id) return null

  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null

    return {
      id: docSnap.id,
      ...docSnap.data(),
    }
  } catch (error) {
    console.error(`[rubrosService] Error al obtener rubro ${id}:`, error)
    return null
  }
}

/**
 * Crea un nuevo rubro en Firestore.
 * @param {Object} data - { descripcion, imagenUrl, activo }
 * @returns {Promise<string>} ID del nuevo documento
 */
export async function createRubro(data) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase no configurado.')
  }

  const payload = {
    descripcion: (data.descripcion || '').trim(),
    activo: Boolean(data.activo !== undefined ? data.activo : true),
    imagen: data.imagenUrl || data.imagen || '',
    imagenUrl: data.imagenUrl || data.imagen || '',
    cloudinaryPublicId: (data.cloudinaryPublicId || data.public_id || '').trim(),
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payload)
  bumpCatalogoVersion()
  return docRef.id
}

/**
 * Actualiza un rubro existente en Firestore.
 * @param {string} id
 * @param {Object} data
 */
export async function updateRubro(id, data) {
  if (!isFirebaseConfigured || !db || !id) {
    throw new Error('Firebase no configurado o ID inválido.')
  }

  const payload = {}
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion.trim()
  if (data.activo !== undefined) payload.activo = Boolean(data.activo)
  if (data.imagenUrl !== undefined || data.imagen !== undefined) {
    const img = data.imagenUrl || data.imagen || ''
    payload.imagen = img
    payload.imagenUrl = img
  }
  if (data.cloudinaryPublicId !== undefined || data.public_id !== undefined) {
    payload.cloudinaryPublicId = (data.cloudinaryPublicId || data.public_id || '').trim()
  }

  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, payload)
  bumpCatalogoVersion()
  return id
}

/**
 * Eliminación lógica de un rubro (activo: false).
 * @param {string} id
 */
export async function deleteRubroLogico(id) {
  return updateRubro(id, { activo: false })
}

/**
 * Alterna el estado activo de un rubro.
 * @param {string} id
 * @param {boolean} currentStatus
 */
export async function toggleActivoRubro(id, currentStatus) {
  return updateRubro(id, { activo: !currentStatus })
}

