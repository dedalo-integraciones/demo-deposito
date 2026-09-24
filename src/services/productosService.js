import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase.js'
import { bumpCatalogoVersion } from './versionService.js'

const COLLECTION_NAME = 'productos'

/**
 * Obtiene todos los productos activos filtrados por activo == true.
 * El ordenamiento por descripción se realiza en cliente (v1).
 * @returns {Promise<Array>} Array de productos activos
 */
export async function getProductosActivos() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[productosService] Firebase no configurado')
    return []
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('activo', '==', true)
    )

    const snapshot = await getDocs(q)
    const productos = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    // Ordenamiento en cliente por descripción (A-Z)
    return productos.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[productosService] Error al obtener productos activos:', error)
    throw error
  }
}

/**
 * Obtiene todos los productos (activos e inactivos) para el panel de administración.
 * @returns {Promise<Array>}
 */
export async function getAllProductos() {
  if (!isFirebaseConfigured || !db) {
    console.warn('[productosService] Firebase no configurado')
    return []
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const productos = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    return productos.sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('[productosService] Error al obtener todos los productos:', error)
    throw error
  }
}

/**
 * Obtiene los productos activos destacados (destacado == true).
 * Filtra y ordena en cliente.
 * @returns {Promise<Array>}
 */
export async function getProductosDestacados() {
  try {
    const productos = await getProductosActivos()
    return productos.filter((p) => p.destacado === true)
  } catch (error) {
    console.error('[productosService] Error al obtener productos destacados:', error)
    return []
  }
}

/**
 * Obtiene los productos activos populares (popular == true).
 * Filtra y ordena en cliente.
 * @returns {Promise<Array>}
 */
export async function getProductosPopulares() {
  try {
    const productos = await getProductosActivos()
    return productos.filter((p) => p.popular === true)
  } catch (error) {
    console.error('[productosService] Error al obtener productos populares:', error)
    return []
  }
}

/**
 * Obtiene productos activos filtrados por ID de categoría en cliente.
 * @param {string} idCategoria
 * @returns {Promise<Array>}
 */
export async function getProductosPorCategoria(idCategoria) {
  try {
    const productos = await getProductosActivos()
    if (!idCategoria) return productos
    return productos.filter((p) => p.idCategoria === idCategoria)
  } catch (error) {
    console.error(`[productosService] Error al obtener productos por categoría ${idCategoria}:`, error)
    return []
  }
}

/**
 * Obtiene un producto por su ID de documento (Código en el modal).
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getProductoById(id) {
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
    console.error(`[productosService] Error al obtener producto ${id}:`, error)
    return null
  }
}

/**
 * Crea un nuevo producto en Firestore (sin campos de precios).
 * @param {Object} data - { codigoOrigen, descripcion, obsUnidad, idCategoria, destacado, popular, activo, imagenUrl, observaciones }
 * @param {string} userId - UID del usuario autenticado que realiza el alta
 * @returns {Promise<string>} ID del nuevo documento
 */
export async function createProducto(data, userId = '') {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase no configurado.')
  }

  const img = data.imagenUrl || data.imagen || ''
  const payload = {
    codigoOrigen: (data.codigoOrigen || '').trim(),
    descripcion: (data.descripcion || '').trim(),
    obsUnidad: (data.obsUnidad || data.unidad || '').trim(),
    observaciones: (data.observaciones || '').trim(),
    idCategoria: (data.idCategoria || '').trim(),
    destacado: Boolean(data.destacado),
    popular: Boolean(data.popular),
    activo: Boolean(data.activo !== undefined ? data.activo : true),
    imagen: img,
    imagenUrl: img,
    cloudinaryPublicId: (data.cloudinaryPublicId || data.public_id || '').trim(),
    fechaAlta: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
    idUsuarioActualizacion: userId || '',
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payload)
  bumpCatalogoVersion()
  return docRef.id
}

/**
 * Actualiza un producto existente en Firestore.
 * @param {string} id
 * @param {Object} data
 * @param {string} userId
 */
export async function updateProducto(id, data, userId = '') {
  if (!isFirebaseConfigured || !db || !id) {
    throw new Error('Firebase no configurado o ID inválido.')
  }

  const payload = {
    fechaActualizacion: serverTimestamp(),
  }
  if (userId) payload.idUsuarioActualizacion = userId

  if (data.codigoOrigen !== undefined) payload.codigoOrigen = data.codigoOrigen.trim()
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion.trim()
  if (data.obsUnidad !== undefined || data.unidad !== undefined) {
    payload.obsUnidad = (data.obsUnidad !== undefined ? data.obsUnidad : data.unidad).trim()
  }
  if (data.observaciones !== undefined) payload.observaciones = data.observaciones.trim()
  if (data.idCategoria !== undefined) payload.idCategoria = data.idCategoria.trim()
  if (data.destacado !== undefined) payload.destacado = Boolean(data.destacado)
  if (data.popular !== undefined) payload.popular = Boolean(data.popular)
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
 * Eliminación lógica de un producto (activo: false).
 * @param {string} id
 * @param {string} userId
 */
export async function deleteProductoLogico(id, userId = '') {
  return updateProducto(id, { activo: false }, userId)
}

/**
 * Alterna el estado activo de un producto.
 * @param {string} id
 * @param {boolean} currentStatus
 * @param {string} userId
 */
export async function toggleActivoProducto(id, currentStatus, userId = '') {
  return updateProducto(id, { activo: !currentStatus }, userId)
}

