import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCatalogoCachedLocal } from '../services/catalogoService.js'

const LS_PRESUPUESTO_KEY = 'deposito_bombal_presupuesto'
const TTL_BORRADOR_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const TTL_ENVIADO_MS = 90 * 24 * 60 * 60 * 1000 // 90 días

const PresupuestoContext = createContext(null)

/**
 * Verifica y limpia automáticamente el estado del carrito si expiró su TTL.
 */
function checkAndCleanTTL(cartData) {
  if (!cartData || !cartData.items || Object.keys(cartData.items).length === 0) {
    return {
      estado: 'borrador',
      fechaGuardado: new Date().toISOString(),
      fechaEnvio: null,
      canal: null,
      items: {},
    }
  }

  const now = Date.now()

  if (cartData.estado === 'enviado') {
    const refTime = cartData.fechaEnvio
      ? new Date(cartData.fechaEnvio).getTime()
      : new Date(cartData.fechaGuardado || now).getTime()

    if (now - refTime > TTL_ENVIADO_MS) {
      // Expiró el plazo de 90 días de la lista enviada -> reset silencioso
      return {
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        fechaEnvio: null,
        canal: null,
        items: {},
      }
    }
  } else {
    // Borrador
    const refTime = cartData.fechaGuardado
      ? new Date(cartData.fechaGuardado).getTime()
      : now

    if (now - refTime > TTL_BORRADOR_MS) {
      // Expiró el plazo de 30 días del borrador -> reset silencioso
      return {
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        fechaEnvio: null,
        canal: null,
        items: {},
      }
    }
  }

  return cartData
}

/**
 * Carga el estado del carrito desde localStorage con compatibilidad retroactiva.
 */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(LS_PRESUPUESTO_KEY)
    if (!raw) {
      return {
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        fechaEnvio: null,
        canal: null,
        items: {},
      }
    }

    const parsed = JSON.parse(raw)
    // Compatibilidad si venía en formato antiguo { [id]: item }
    if (parsed && !parsed.estado && typeof parsed === 'object') {
      const isLegacyItems = !parsed.items && Object.values(parsed).some((v) => v && v.id)
      const initialItems = isLegacyItems ? parsed : (parsed.items || {})
      return checkAndCleanTTL({
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        fechaEnvio: null,
        canal: null,
        items: initialItems,
      })
    }

    return checkAndCleanTTL({
      estado: parsed.estado || 'borrador',
      fechaGuardado: parsed.fechaGuardado || new Date().toISOString(),
      fechaEnvio: parsed.fechaEnvio || null,
      canal: parsed.canal || null,
      items: parsed.items || {},
    })
  } catch (e) {
    console.warn('[PresupuestoContext] Error al leer storage:', e)
    return {
      estado: 'borrador',
      fechaGuardado: new Date().toISOString(),
      fechaEnvio: null,
      canal: null,
      items: {},
    }
  }
}

export function PresupuestoProvider({ children }) {
  const [cartState, setCartState] = useState(loadCartFromStorage)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [cachedProductos, setCachedProductos] = useState(() => {
    const cached = getCatalogoCachedLocal()
    return cached?.productos || null
  })

  // Sincronizar con el caché del catálogo en memoria/localStorage sin lecturas extra a Firestore
  const actualizarCacheLocal = useCallback(() => {
    const cached = getCatalogoCachedLocal()
    if (cached?.productos) {
      setCachedProductos(cached.productos)
    }
  }, [])

  // Persistir en localStorage ante cualquier cambio
  useEffect(() => {
    try {
      localStorage.setItem(LS_PRESUPUESTO_KEY, JSON.stringify(cartState))
    } catch (e) {
      console.error('[PresupuestoContext] Error guardando en storage:', e)
    }
  }, [cartState])

  // Al abrir el drawer, ejecutar chequeo silencioso de TTL y actualizar contraste con caché local
  const openDrawer = useCallback(() => {
    setCartState((prev) => checkAndCleanTTL(prev))
    actualizarCacheLocal()
    setIsDrawerOpen(true)
  }, [actualizarCacheLocal])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  // Agregar o alternar producto
  const toggleItem = useCallback((producto, cantidad = 1) => {
    if (!producto || !producto.id) return

    setCartState((prev) => {
      const copy = { ...prev.items }
      if (copy[producto.id]) {
        delete copy[producto.id]
      } else {
        const cant = Math.max(1, parseInt(cantidad, 10) || 1)
        copy[producto.id] = {
          id: producto.id,
          descripcion: producto.descripcion || 'Sin descripción',
          obsUnidad: producto.obsUnidad || '',
          cantidad: cant,
        }
      }
      return {
        ...prev,
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        fechaEnvio: null,
        canal: null,
        items: copy,
      }
    })
  }, [])

  // Modificar cantidad
  const updateCantidad = useCallback((id, cantidad) => {
    const cant = Math.max(1, parseInt(cantidad, 10) || 1)
    setCartState((prev) => {
      if (!prev.items[id]) return prev
      return {
        ...prev,
        estado: 'borrador',
        fechaGuardado: new Date().toISOString(),
        items: {
          ...prev.items,
          [id]: {
            ...prev.items[id],
            cantidad: cant,
          },
        },
      }
    })
  }, [])

  // Quitar ítem
  const removeItem = useCallback((id) => {
    setCartState((prev) => {
      const copy = { ...prev.items }
      delete copy[id]
      return {
        ...prev,
        fechaGuardado: new Date().toISOString(),
        items: copy,
      }
    })
  }, [])

  // Iniciar lista nueva (vacía y arranca en borrador)
  const iniciarNuevaLista = useCallback(() => {
    setCartState({
      estado: 'borrador',
      fechaGuardado: new Date().toISOString(),
      fechaEnvio: null,
      canal: null,
      items: {},
    })
  }, [])

  // Vaciar carrito (alias de iniciarNuevaLista)
  const clearCart = iniciarNuevaLista

  // Reusar lista enviada como borrador
  const reusarComoBorrador = useCallback(() => {
    setCartState((prev) => ({
      ...prev,
      estado: 'borrador',
      fechaGuardado: new Date().toISOString(),
      fechaEnvio: null,
      canal: null,
    }))
  }, [])

  // Marcar como enviado por un canal ('email' | 'whatsapp') SIN vaciar los items
  const marcarEnviado = useCallback((canal) => {
    setCartState((prev) => ({
      ...prev,
      estado: 'enviado',
      fechaEnvio: new Date().toISOString(),
      canal: canal || 'email',
    }))
  }, [])

  // Comprobar si un producto está en el carrito
  const isInCart = useCallback(
    (id) => {
      return Boolean(cartState.items[id])
    },
    [cartState.items]
  )

  // Obtener cantidad actual
  const getItemCantidad = useCallback(
    (id) => {
      return cartState.items[id]?.cantidad || 1
    },
    [cartState.items]
  )

  // Lista de items contrastada contra el catálogo en caché local
  const rawItemsList = Object.values(cartState.items)

  const itemsList = rawItemsList.map((item) => {
    let noDisponible = false
    if (cachedProductos && Array.isArray(cachedProductos)) {
      const prod = cachedProductos.find((p) => String(p.id) === String(item.id))
      if (!prod || prod.activo === false) {
        noDisponible = true
      }
    }
    return {
      ...item,
      noDisponible,
    }
  })

  const itemsDisponiblesList = itemsList.filter((item) => !item.noDisponible)
  const totalProducts = itemsList.length
  const totalDisponibles = itemsDisponiblesList.length
  const totalUnidades = itemsList.reduce((acc, curr) => acc + (curr.cantidad || 1), 0)

  return (
    <PresupuestoContext.Provider
      value={{
        items: cartState.items,
        itemsList,
        itemsDisponiblesList,
        estado: cartState.estado,
        fechaGuardado: cartState.fechaGuardado,
        fechaEnvio: cartState.fechaEnvio,
        canal: cartState.canal,
        totalProducts,
        totalDisponibles,
        totalUnidades,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleItem,
        updateCantidad,
        removeItem,
        clearCart,
        iniciarNuevaLista,
        reusarComoBorrador,
        marcarEnviado,
        isInCart,
        getItemCantidad,
        actualizarCacheLocal,
      }}
    >
      {children}
    </PresupuestoContext.Provider>
  )
}

export function usePresupuesto() {
  const context = useContext(PresupuestoContext)
  if (!context) {
    throw new Error('usePresupuesto debe ser usado dentro de PresupuestoProvider')
  }
  return context
}
