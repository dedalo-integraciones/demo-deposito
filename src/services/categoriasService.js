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

const COLLECTION_NAME = 'categorias'

/**
 * Obtiene todas las categorías activas filtradas por activo == true.
 * El ordenamiento por descripción se realiza en cliente (v1).
 * @returns {Promise<Array>} Array de categorías [{ id, idRubro, descripcion, observaciones, activo, imagen }, ...]
 */
export async function getCategoriasActivas() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[categoriasService] Firebase no configurado')
    return []
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('activo', '==', true)
    )

    const snapshot = await getDocs(q)
    const categorias = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    // Ordenamiento en cliente por descripción (A-Z)
    return categorias.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[categoriasService] Error al obtener categorías activas:', error)
    throw error
  }
}

/**
 * Obtiene todas las categorías (activas e inactivas) para el panel de administración.
 * @returns {Promise<Array>}
 */
export async function getAllCategorias() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[categoriasService] Firebase no configurado')
    return []
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const categorias = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    return categorias.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[categoriasService] Error al obtener todas las categorías:', error)
    throw error
  }
}

/**
 * Obtiene categorías activas filtradas por rubro en cliente (v1).
 * @param {string} idRubro
 * @returns {Promise<Array>}
 */
export async function getCategoriasPorRubro(idRubro) {
  try {
    const todas = await getCategoriasActivas()
    if (!idRubro) return todas
    return todas.filter((cat) => cat.idRubro === idRubro)
  } catch (error) {
    console.error(`[categoriasService] Error al obtener categorías por rubro ${idRubro}:`, error)
    return []
  }
}

/**
 * Obtiene una categoría por su ID de documento.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getCategoriaById(id) {
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
    console.error(`[categoriasService] Error al obtener categoría ${id}:`, error)
    return null
  }
}

/**
 * Crea una nueva categoría en Firestore.
 * @param {Object} data - { idRubro, descripcion, observaciones, imagenUrl, activo }
 * @returns {Promise<string>} ID del nuevo documento
 */
export async function createCategoria(data) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase no configurado.')
  }

  const payload = {
    idRubro: (data.idRubro || '').trim(),
    descripcion: (data.descripcion || '').trim(),
    observaciones: (data.observaciones || '').trim(),
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
 * Actualiza una categoría existente en Firestore.
 * @param {string} id
 * @param {Object} data
 */
export async function updateCategoria(id, data) {
  if (!isFirebaseConfigured || !db || !id) {
    throw new Error('Firebase no configurado o ID inválido.')
  }

  const payload = {}
  if (data.idRubro !== undefined) payload.idRubro = data.idRubro.trim()
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion.trim()
  if (data.observaciones !== undefined) payload.observaciones = data.observaciones.trim()
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
 * Eliminación lógica de una categoría (activo: false).
 * @param {string} id
 */
export async function deleteCategoriaLogico(id) {
  return updateCategoria(id, { activo: false })
}

/**
 * Alterna el estado activo de una categoría.
 * @param {string} id
 * @param {boolean} currentStatus
 */
export async function toggleActivoCategoria(id, currentStatus) {
  return updateCategoria(id, { activo: !currentStatus })
}

