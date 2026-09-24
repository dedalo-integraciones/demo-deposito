import { getRubrosActivos } from './rubrosService.js'
import { getCategoriasActivas } from './categoriasService.js'
import { getProductosActivos } from './productosService.js'
import { getCatalogoVersionFirestore } from './versionService.js'

// Claves de localStorage
const LS_CATALOGO_KEY = 'deposito_bombal_catalogo_cache'
const LS_VERSION_KEY = 'deposito_bombal_catalogo_version'

// Caché en memoria para evitar peticiones duplicadas o parsing constante durante la sesión
let catalogoCachePromise = null
let catalogoDataCache = null

/**
 * Identifica si un error de Firestore corresponde a agotamiento de cuota (resource-exhausted / código 8).
 */
export function isQuotaExhaustedError(error) {
  if (!error) return false
  const code = String(error.code || '').toLowerCase()
  const msg = String(error.message || '').toLowerCase()
  return (
    code === 'resource-exhausted' ||
    code === '8' ||
    code.includes('resource-exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('quota') ||
    msg.includes('exhausted')
  )
}

/**
 * Función auxiliar para leer caché guardado en localStorage.
 */
function getCatalogoLocalStorage() {
  try {
    const rawData = localStorage.getItem(LS_CATALOGO_KEY)
    const storedVersion = localStorage.getItem(LS_VERSION_KEY)
    if (!rawData || !storedVersion) return null

    const parsed = JSON.parse(rawData)
    if (parsed && Array.isArray(parsed.rubros) && Array.isArray(parsed.categorias) && Array.isArray(parsed.productos)) {
      return {
        data: parsed,
        version: storedVersion,
      }
    }
    return null
  } catch (e) {
    console.warn('[catalogoService] Error al leer localStorage:', e)
    return null
  }
}

/**
 * Obtiene el catálogo cacheado en memoria o localStorage sin realizar NINGUNA lectura a Firestore.
 */
export function getCatalogoCachedLocal() {
  if (catalogoDataCache) {
    return catalogoDataCache
  }
  const local = getCatalogoLocalStorage()
  return local ? local.data : null
}

/**
 * Función auxiliar para guardar catálogo y versión en localStorage.
 */
function setCatalogoLocalStorage(data, version) {
  try {
    if (!data) return
    localStorage.setItem(LS_CATALOGO_KEY, JSON.stringify(data))
    if (version) {
      localStorage.setItem(LS_VERSION_KEY, String(version))
    }
  } catch (e) {
    console.warn('[catalogoService] Error al escribir en localStorage (posible quota limit):', e)
  }
}

/**
 * Función interna para consultar Firestore fresco y consolidado.
 */
async function fetchCatalogoFirestoreFresco() {
  const [rubros, categorias, productos] = await Promise.all([
    getRubrosActivos(),
    getCategoriasActivas(),
    getProductosActivos(),
  ])

  return {
    rubros: rubros || [],
    categorias: categorias || [],
    productos: productos || [],
  }
}

/**
 * Obtiene todos los rubros, categorías y productos activos.
 * 
 * Flujo de caché con sello de versión y degradación elegante ante agotamiento de cuota:
 * 1. Si forceRefresh = true:
 *    Lee directo de Firestore. Si falla y hay caché en localStorage, usa el caché con isDesactualizado = true.
 * 2. Si ya está en memoria y no es forceRefresh:
 *    Retorna inmediatamente el objeto en memoria.
 * 3. En carga inicial / refresco público:
 *    - Lee ÚNICAMENTE el documento 'meta/catalogoVersion' de Firestore.
 *    - Si falla la lectura de la versión (ej. resource-exhausted / código 8 / red):
 *      -> Si existe caché en localStorage: sirve el caché y activa isDesactualizado = true.
 *      -> Si no existe caché: activa errorCuotaSinCache = true.
 *    - Si la versión coincide con localStorage: usa el caché y NO lee colecciones.
 *    - Si difiere o no hay caché: intenta leer el catálogo completo fresco.
 *      -> Si la lectura de colecciones falla:
 *         -> Si existe caché previo: sirve el caché con isDesactualizado = true.
 *         -> Si no existe caché: activa errorCuotaSinCache = true.
 */
export async function getCatalogoCompleto(forceRefresh = false) {
  // Bypass total de caché para panel admin o llamadas forzadas
  if (forceRefresh) {
    try {
      const fresco = await fetchCatalogoFirestoreFresco()
      catalogoDataCache = fresco
      return {
        ...fresco,
        isDesactualizado: false,
        errorCuotaSinCache: false,
      }
    } catch (err) {
      console.warn('[catalogoService] Error en forceRefresh fresco:', err)
      const localCached = getCatalogoLocalStorage()
      if (localCached) {
        catalogoDataCache = localCached.data
        return {
          ...localCached.data,
          isDesactualizado: true,
          errorCuotaSinCache: false,
        }
      }
      return {
        rubros: [],
        categorias: [],
        productos: [],
        isDesactualizado: false,
        errorCuotaSinCache: true,
        error: err,
      }
    }
  }

  // Caché en memoria existente para evitar parsing repetido durante la navegación
  if (catalogoDataCache) {
    return {
      ...catalogoDataCache,
      isDesactualizado: false,
      errorCuotaSinCache: false,
    }
  }

  if (catalogoCachePromise) {
    return catalogoCachePromise
  }

  catalogoCachePromise = (async () => {
    try {
      let firestoreVersion = null
      let versionReadError = null

      try {
        // 1. Leer sello de versión desde Firestore (solo 1 lectura a meta/catalogoVersion)
        firestoreVersion = await getCatalogoVersionFirestore()
      } catch (err) {
        versionReadError = err
        console.warn('[catalogoService] Falló lectura de meta/catalogoVersion:', err)
      }

      const localCached = getCatalogoLocalStorage()

      // Si falló la lectura de la versión (por ejemplo error de cuota resource-exhausted)
      if (versionReadError) {
        if (localCached) {
          catalogoDataCache = localCached.data
          return {
            ...localCached.data,
            isDesactualizado: true,
            errorCuotaSinCache: false,
          }
        }
        return {
          rubros: [],
          categorias: [],
          productos: [],
          isDesactualizado: false,
          errorCuotaSinCache: true,
          error: versionReadError,
        }
      }

      // 2. Si Firestore tiene versión y coincide con localStorage, usamos la caché sin leer colecciones
      if (firestoreVersion && localCached && localCached.version === String(firestoreVersion)) {
        catalogoDataCache = localCached.data
        return {
          ...localCached.data,
          isDesactualizado: false,
          errorCuotaSinCache: false,
        }
      }

      // 3. Si difiere o no hay caché: leer catálogo completo fresco desde Firestore
      try {
        const fresco = await fetchCatalogoFirestoreFresco()
        catalogoDataCache = fresco

        // Si no existía el documento de versión en Firestore todavía, usamos timestamp local como referencia
        let versionAGuardar = firestoreVersion
        if (!versionAGuardar) {
          versionAGuardar = String(Date.now())
        }

        // Guardar en localStorage con la versión correspondiente
        setCatalogoLocalStorage(fresco, versionAGuardar)

        return {
          ...fresco,
          isDesactualizado: false,
          errorCuotaSinCache: false,
        }
      } catch (fetchError) {
        console.error('[catalogoService] Falló lectura fresca de catálogo:', fetchError)
        if (localCached) {
          catalogoDataCache = localCached.data
          return {
            ...localCached.data,
            isDesactualizado: true,
            errorCuotaSinCache: false,
          }
        }
        return {
          rubros: [],
          categorias: [],
          productos: [],
          isDesactualizado: false,
          errorCuotaSinCache: true,
          error: fetchError,
        }
      }
    } catch (err) {
      console.error('[catalogoService] Error en getCatalogoCompleto:', err)
      const fallback = getCatalogoLocalStorage()
      if (fallback?.data) {
        catalogoDataCache = fallback.data
        return {
          ...fallback.data,
          isDesactualizado: true,
          errorCuotaSinCache: false,
        }
      }
      return {
        rubros: [],
        categorias: [],
        productos: [],
        isDesactualizado: false,
        errorCuotaSinCache: true,
        error: err,
      }
    } finally {
      catalogoCachePromise = null
    }
  })()

  return catalogoCachePromise
}

/**
 * Invalida el caché en memoria y en localStorage.
 */
export function invalidarCatalogoCache() {
  catalogoDataCache = null
  catalogoCachePromise = null
  try {
    localStorage.removeItem(LS_CATALOGO_KEY)
    localStorage.removeItem(LS_VERSION_KEY)
  } catch (e) {
    // Silencioso
  }
}
