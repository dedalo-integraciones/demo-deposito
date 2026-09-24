import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Flame,
  Eye,
  MessageCircle,
  Plus,
  Minus,
  ClipboardPlus,
} from 'lucide-react'
import { getCatalogoCompleto } from '../services/catalogoService.js'
import { usePresupuesto } from '../context/PresupuestoContext.jsx'
import { getImageUrl } from '../utils/cloudinary.js'
import ModalProducto from './ModalProducto.jsx'

/**
 * Sección Populares (PASO 8):
 * - Carrusel de 1 línea con productos populares (popular == true).
 * - Mismo diseño de tarjetas que Destacados con insignia 'Popular'.
 * - Modal de detalle al hacer clic en una tarjeta (ModalProducto existente).
 * - ⚠️ ESTRICTO: Sin precios en ninguna parte.
 * - Estado vacío elegante: 'Catálogo en actualización'.
 */
export default function Populares() {
  const [productos, setProductos] = useState([])
  const [categoriasMap, setCategoriasMap] = useState({})
  const [rubrosMap, setRubrosMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Estado del modal
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Carrito de presupuesto
  const { isInCart, toggleItem, updateCantidad, getItemCantidad } = usePresupuesto()
  const [localQuantities, setLocalQuantities] = useState({})

  const getCardQty = (id) => {
    if (isInCart(id)) return getItemCantidad(id)
    return localQuantities[id] || 0
  }

  const handleQtyChange = (prod, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1)
    if (isInCart(prod.id)) {
      updateCantidad(prod.id, qty)
    } else {
      setLocalQuantities((prev) => ({ ...prev, [prod.id]: qty }))
    }
  }

  const handleToggleCart = (prod) => {
    if (isInCart(prod.id)) {
      toggleItem(prod)
      setLocalQuantities((prev) => ({ ...prev, [prod.id]: 0 }))
    } else {
      toggleItem(prod, 1)
      setLocalQuantities((prev) => ({ ...prev, [prod.id]: 1 }))
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)

  const carouselRef = useRef(null)
  const titleRef = useRef(null)
  const [titleInView, setTitleInView] = useState(false)

  // Medir ancho del contenedor para el desplazamiento y centrado
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (carouselRef.current) {
        setContainerWidth(carouselRef.current.offsetWidth || 0)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (carouselRef.current) {
      setContainerWidth(carouselRef.current.offsetWidth || 0)
    }
  }, [productos.length, loading])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTitleInView(true)
        }
      },
      { threshold: 0.15 }
    )

    if (titleRef.current) {
      observer.observe(titleRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let isMounted = true

    async function cargarPopularesYRelaciones() {
      try {
        setLoading(true)
        // Obtención consolidada y compartida desde catalogoService (1 sola consulta en red)
        const { rubros, categorias, productos: todosProductos } = await getCatalogoCompleto()

        if (!isMounted) return

        // Mapa de categorías por id
        const catMap = {}
        ;(categorias || []).forEach((c) => {
          catMap[c.id] = c
        })
        setCategoriasMap(catMap)

        // Mapa de rubros por id
        const rubMap = {}
        ;(rubros || []).forEach((r) => {
          rubMap[r.id] = r
        })
        setRubrosMap(rubMap)

        const populares = (todosProductos || []).filter((p) => p.popular === true)
        setProductos(populares)
        if (populares.length > 0) {
          // Iniciar en el primer elemento del bloque central
          setCurrentIndex(populares.length)
        }
      } catch (err) {
        console.error('[Populares] Error al cargar productos populares:', err)
        if (isMounted) setProductos([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    cargarPopularesYRelaciones()

    return () => {
      isMounted = false
    }
  }, [])

  // Lista triplicada para garantizar buffer infinito a izquierda y derecha
  const displayProductos = useMemo(() => {
    if (!productos || productos.length === 0) return []
    return [...productos, ...productos, ...productos]
  }, [productos])

  const n = productos.length

  const handleTransitionEnd = () => {
    if (n === 0) return
    // Si sobrepasó el bloque central hacia la derecha
    if (currentIndex >= 2 * n) {
      setIsTransitioning(false)
      setCurrentIndex((prev) => prev - n)
    }
    // Si sobrepasó el bloque central hacia la izquierda
    else if (currentIndex < n) {
      setIsTransitioning(false)
      setCurrentIndex((prev) => prev + n)
    }
  }

  // Re-habilitar transición luego de reset instantáneo silencioso
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true)
        })
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isTransitioning])

  const scrollLeft = () => {
    if (n === 0) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev - 1)
  }

  const scrollRight = () => {
    if (n === 0) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev + 1)
  }

  // Cálculo de desplazamiento transform:
  // Mobile (<640px): Centrado exacto: (anchoContenedor / 2 - anchoSlide / 2) - indice * (anchoSlide + gap)
  // Desktop (>=640px): Desplazamiento por tarjetas (indice * (anchoTarjeta + gap))
  const getTranslateX = () => {
    if (typeof window === 'undefined' || n === 0) return 0
    if (isMobile) {
      const slideWidth = Math.min(window.innerWidth * 0.78, 320)
      const gap = 16
      const containerW = containerWidth || (carouselRef.current?.offsetWidth || window.innerWidth - 32)
      return (containerW / 2 - slideWidth / 2) - currentIndex * (slideWidth + gap)
    }

    // Desktop
    const gap = 20
    const cardWidth = window.innerWidth >= 768 ? 210 : 200
    const step = cardWidth + gap
    return -(currentIndex * step)
  }

  const handleOpenModal = (producto) => {
    setSelectedProducto(producto)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProducto(null)
  }

  const getCategoriaNombre = (idCategoria) => {
    return categoriasMap[idCategoria]?.descripcion || ''
  }

  const getRubroNombre = (idCategoria) => {
    const idRubro = categoriasMap[idCategoria]?.idRubro
    return rubrosMap[idRubro]?.descripcion || ''
  }

  return (
    <section
      id="populares"
      className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12 md:py-16 bg-[#EFE5CE] border-t border-b border-[#D8C7A5]"
    >
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200 mb-2">
            <Flame className="w-3.5 h-3.5" />
            <span>Tendencias de demanda</span>
          </div>
          <h2
            ref={titleRef}
            className={`text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight fade-left-title ${
              titleInView ? 'in-view' : ''
            }`}
          >
            Productos <span className="text-[var(--primary)]">Populares</span>
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1 max-w-xl">
            Los artículos más consultados y solicitados por nuestros clientes comerciales y particulares.
          </p>
        </div>
      </div>

      {/* Contenedor con flechas de navegación al medio vertical */}
      <div className="relative group/carousel">
        {/* Flecha Izquierda (Al medio de la pantalla/carrusel) */}
        {productos.length > 0 && (
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Producto popular anterior"
            className="absolute -left-3 sm:-left-5 lg:-left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-[var(--text)] hover:text-orange-600 border border-[#D8C7A5] shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 hover:scale-105"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        {/* Flecha Derecha (Al medio de la pantalla/carrusel) */}
        {productos.length > 0 && (
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Siguiente producto popular"
            className="absolute -right-3 sm:-right-5 lg:-right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-[var(--text)] hover:text-orange-600 border border-[#D8C7A5] shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 hover:scale-105"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        {/* Contenido: Carrusel de 1 línea, Skeleton o Estado Vacío */}
        {loading ? (
        <div className="flex gap-5 overflow-hidden py-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="w-[260px] sm:w-[280px] md:w-[300px] shrink-0 rounded-2xl bg-white p-4 border border-gray-200 shadow-xs animate-pulse"
            >
              <div className="w-full h-44 bg-gray-200 rounded-xl mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-100 rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : productos.length > 0 ? (
        <div
          ref={carouselRef}
          className="relative w-full overflow-hidden py-3"
        >
          <div
            onTransitionEnd={handleTransitionEnd}
            className={`flex gap-4 sm:gap-5 justify-start ${
              isTransitioning ? 'transition-transform duration-300 ease-out' : ''
            }`}
            style={{
              transform: `translateX(${getTranslateX()}px)`,
            }}
          >
            {displayProductos.map((prod, idx) => {
              const catNombre = getCategoriaNombre(prod.idCategoria)
              const rubroNombre = getRubroNombre(prod.idCategoria)

              return (
                <div
                  key={`${prod.id}-popbuf-${idx}`}
                  onClick={() => handleOpenModal(prod)}
                  className={`w-[min(78vw,320px)] sm:w-[200px] md:w-[210px] shrink-0 bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col group cursor-pointer ${
                    isInCart(prod.id)
                      ? 'border-red-400 ring-2 ring-red-100 shadow-md'
                      : 'border-gray-200/90 shadow-xs hover:shadow-xl hover:border-orange-300'
                  }`}
                >
                {/* Contenedor de Imagen */}
                <div className="card-img relative border-b border-gray-100 shrink-0">
                  {prod.imagen ? (
                    <img
                      src={getImageUrl(prod.imagen, 800)}
                      alt={prod.descripcion}
                      className="group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF6EE] text-[#8C7A60] gap-1 p-3 select-none">
                      <Package className="w-5 h-5 stroke-[1.5] text-[#A69376] group-hover:text-orange-600 transition-colors" />
                      <span className="text-[11px] font-medium text-[#8C7A60] tracking-tight">Sin imagen</span>
                    </div>
                  )}

                  {/* Badge de popular */}
                  <span className="absolute top-2.5 left-2.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Popular
                  </span>

                  {/* Hover icon para ver detalle */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-bold text-[var(--text)] shadow-md">
                      <Eye className="w-3 h-3 text-orange-600" />
                      <span>Ver ficha</span>
                    </span>
                  </div>
                </div>

                {/* Información del producto (SIN PRECIOS) */}
                <div className="p-3 sm:p-3.5 flex flex-col flex-1">
                  <div>
                    {/* Categoría / Rubro */}
                    {(catNombre || rubroNombre) && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 uppercase tracking-wider mb-1.5 line-clamp-1">
                        <span>{rubroNombre || 'General'}</span>
                        {catNombre && <span>•</span>}
                        <span>{catNombre}</span>
                      </div>
                    )}

                    <h3 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 leading-snug">
                      {prod.descripcion}
                    </h3>

                    {prod.obsUnidad && (
                      <p className="text-xs text-[var(--muted)] font-medium mt-1.5 line-clamp-1">
                        Unidad: {prod.obsUnidad}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 space-y-2.5">
                    {/* Checkbox de selección + Selector de cantidad */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCart(prod)}
                        className={`btn-secondary flex-1 min-w-0 !px-2.5 sm:!px-3.5 !py-2 cursor-pointer select-none text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isInCart(prod.id) ? '!bg-[#FEF2F2] ring-1 ring-[var(--primary)]/30 font-bold' : ''
                        }`}
                      >
                        <ClipboardPlus className="w-4 h-4 shrink-0" />
                        <span className="truncate">Presupuestar</span>
                      </button>

                      {isInCart(prod.id) && (
                        <div className="flex items-center h-[38px] border border-gray-300 rounded-lg bg-white overflow-hidden shadow-2xs shrink-0 divide-x divide-gray-200 animate-qty-appear">
                          <button
                            type="button"
                            onClick={() =>
                              handleQtyChange(prod, getCardQty(prod.id) - 1)
                            }
                            disabled={getCardQty(prod.id) <= 1}
                            aria-label="Disminuir cantidad"
                            className="w-7.5 sm:w-8 h-full flex items-center justify-center text-gray-700 hover:text-[var(--primary)] hover:bg-red-50/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:text-gray-400 active:scale-90 transition-all cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={getCardQty(prod.id)}
                            onChange={(e) =>
                              handleQtyChange(prod, e.target.value)
                            }
                            className="w-8 sm:w-10 text-center text-xs sm:text-sm font-bold text-gray-900 bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQtyChange(prod, getCardQty(prod.id) + 1)
                            }
                            aria-label="Aumentar cantidad"
                            className="w-7.5 sm:w-8 h-full flex items-center justify-center text-gray-700 hover:text-[var(--primary)] hover:bg-red-50/80 active:scale-90 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botón de acción Secundario para ver detalle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedProducto(prod)}
                        className="btn-secondary w-full"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      ) : (
        /* Estado Vacío elegante */
        <div className="w-full max-w-2xl mx-auto bg-gray-50 rounded-2xl border border-gray-200 shadow-xs p-8 sm:p-12 text-center my-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-100 shadow-2xs">
            <Package className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] mb-2">
            Catálogo en actualización
          </h3>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-6 max-w-md mx-auto">
            Los productos populares se están incorporando a nuestra plataforma. Podés consultarnos directamente por stock y disponibilidad de cualquier artículo.
          </p>
          <a
            href="https://wa.me/5492612430105?text=Hola%2C%20quisiera%20consultar%20por%20los%20productos%20populares%20disponibles"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md hover:shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar disponibilidad por WhatsApp</span>
          </a>
        </div>
      )}
      </div>

      {/* Modal de Detalle de Producto */}
      {selectedProducto && (
        <ModalProducto
          producto={selectedProducto}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          categoriaNombre={getCategoriaNombre(selectedProducto.idCategoria)}
          rubroNombre={getRubroNombre(selectedProducto.idCategoria)}
        />
      )}
    </section>
  )
}
