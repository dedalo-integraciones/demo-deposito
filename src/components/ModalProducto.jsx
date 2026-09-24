import { useEffect, useState } from 'react'
import { X, Package, Tag, Layers, FileText, MessageCircle, Plus, Minus } from 'lucide-react'
import { getCategoriaById } from '../services/categoriasService.js'
import { getRubroById } from '../services/rubrosService.js'
import { usePresupuesto } from '../context/PresupuestoContext.jsx'
import { getImageUrl } from '../utils/cloudinary.js'

/**
 * Modal de detalle de producto.
 * Muestra estrictamente:
 * - Descripción
 * - Obs/Unidad
 * - Descripción de Rubro
 * - Descripción de Categoría
 * ⚠️ ESTRICTO: NO muestra precios ni IDs/códigos internos.
 */
export default function ModalProducto({
  producto,
  isOpen,
  onClose,
  categoriaNombre = '',
  rubroNombre = '',
}) {
  const [catDesc, setCatDesc] = useState(categoriaNombre)
  const [rubroDesc, setRubroDesc] = useState(rubroNombre)
  const [resolving, setResolving] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Resolver descripciones de categoría y rubro en cliente si no vienen precargadas
  useEffect(() => {
    if (!producto || !isOpen) return

    if (categoriaNombre && rubroNombre) {
      setCatDesc(categoriaNombre)
      setRubroDesc(rubroNombre)
      return
    }

    let isMounted = true
    async function resolverRelaciones() {
      setResolving(true)
      try {
        let catD = categoriaNombre
        let rubD = rubroNombre

        if (!catD && producto.idCategoria) {
          const cat = await getCategoriaById(producto.idCategoria)
          if (cat) {
            catD = cat.descripcion || 'Sin categoría'
            if (!rubD && cat.idRubro) {
              const rub = await getRubroById(cat.idRubro)
              if (rub) rubD = rub.descripcion || 'Sin rubro'
            }
          }
        }

        if (isMounted) {
          setCatDesc(catD || 'No asignada')
          setRubroDesc(rubD || 'No asignado')
        }
      } catch (err) {
        console.error('[ModalProducto] Error resolviendo relaciones:', err)
        if (isMounted) {
          setCatDesc(categoriaNombre || 'No disponible')
          setRubroDesc(rubroNombre || 'No disponible')
        }
      } finally {
        if (isMounted) setResolving(false)
      }
    }

    resolverRelaciones()
    return () => {
      isMounted = false
    }
  }, [producto, isOpen, categoriaNombre, rubroNombre])

  const { isInCart, toggleItem, updateCantidad, getItemCantidad } = usePresupuesto()
  const inCart = producto ? isInCart(producto.id) : false
  const modalQty = producto ? getItemCantidad(producto.id) : 1

  if (!isOpen || !producto) return null

  const whatsappUrl = `https://wa.me/5492612430105?text=${encodeURIComponent(
    `Hola, quisiera consultar por el producto "${producto.descripcion}"`
  )}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-producto-titulo"
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
              Ficha de producto
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Imagen o Placeholder */}
          <div
            className="w-full bg-white rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-200 p-2 sm:p-4"
            style={{ maxHeight: '500px', backgroundColor: '#ffffff' }}
          >
            {producto.imagen ? (
              <img
                src={getImageUrl(producto.imagen, 1200)}
                alt={producto.descripcion}
                className="max-h-[500px] w-auto max-w-full object-contain mx-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center bg-[#FAF6EE] text-[#8C7A60] rounded-xl py-16 px-4 gap-2">
                <Package className="w-8 h-8 stroke-[1.5] text-[#A69376]" />
                <span className="text-xs font-medium text-[#8C7A60]">
                  Sin imagen
                </span>
              </div>
            )}

            {producto.destacado && (
              <span className="absolute top-3 right-3 bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                Destacado
              </span>
            )}
          </div>

          {/* Título y Descripción Principal */}
          <div>
            <h2
              id="modal-producto-titulo"
              className="text-xl sm:text-2xl font-bold text-[var(--text)] leading-snug"
            >
              {producto.descripcion}
            </h2>
          </div>

          {/* Grilla de campos obligatorios requeridos por especificación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-gray-50 p-4 rounded-xl border border-gray-100">
            {/* Obs / Unidad */}
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-white text-[var(--primary)] border border-gray-200 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Obs / Unidad
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {producto.obsUnidad ? producto.obsUnidad : '—'}
                </span>
              </div>
            </div>

            {/* Rubro */}
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-white text-[var(--primary)] border border-gray-200 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Rubro
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {resolving ? 'Cargando...' : rubroDesc || '—'}
                </span>
              </div>
            </div>

            {/* Categoría */}
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-white text-[var(--primary)] border border-gray-200 shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Categoría
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {resolving ? 'Cargando...' : catDesc || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Control para Agregar al Carrito de Presupuesto */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inCart}
                onChange={() => toggleItem(producto, modalQty)}
                className="w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)] accent-[var(--primary)] cursor-pointer"
              />
              <div>
                <span
                  className={`text-sm ${
                    inCart ? 'font-bold text-[var(--primary)]' : 'font-semibold text-gray-800'
                  }`}
                >
                  {inCart ? 'Seleccionado para presupuesto' : 'Incluir en presupuesto'}
                </span>
                <span className="block text-[11px] text-[var(--muted)]">
                  {inCart
                    ? 'Podés modificar la cantidad o quitarlo en cualquier momento'
                    : 'Marcá para solicitar cotización de este artículo'}
                </span>
              </div>
            </label>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium">Cantidad:</span>
              <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => updateCantidad(producto.id, modalQty - 1)}
                  disabled={modalQty <= 1}
                  aria-label="Disminuir cantidad"
                  className="px-2 py-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={modalQty}
                  onChange={(e) => updateCantidad(producto.id, e.target.value)}
                  className="w-11 text-center text-xs font-bold text-[var(--text)] py-1 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => updateCantidad(producto.id, modalQty + 1)}
                  aria-label="Aumentar cantidad"
                  className="px-2 py-1 text-gray-500 hover:bg-gray-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del modal con acciones */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full sm:w-auto"
          >
            Cerrar
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp w-full sm:w-auto"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  )
}
