import { useState, useEffect } from 'react'
import { Info, AlertTriangle, X, Loader2, ArrowRight } from 'lucide-react'

/**
 * Modal de doble confirmación para el sistema de Soft Delete (desactivación).
 * Paso 1: Aviso explícito con mensaje según tipo de elemento (Rubro, Categoría, Producto).
 * Paso 2: Confirmación final con botones Cancelar (gris) y "Sí, desactivar" (rojo).
 */
export default function ModalConfirmacionDesactivacion({
  isOpen,
  onClose,
  onConfirm,
  tipo = 'producto', // 'rubro' | 'categoria' | 'producto'
  nombreElemento = '',
  isProcessing = false,
}) {
  const [paso, setPaso] = useState(1)

  // Reiniciar al paso 1 cada vez que se abre el modal o cambia el elemento
  useEffect(() => {
    if (isOpen) {
      setPaso(1)
    }
  }, [isOpen, nombreElemento])

  if (!isOpen) return null

  // Mensajes explícitos según el tipo de elemento
  const getMensajePaso1 = () => {
    const t = tipo.toLowerCase()
    if (t === 'rubro') {
      return 'Al desactivar este rubro, todas sus categorías y productos asociados también se ocultarán del catálogo.'
    }
    if (t === 'categoria' || t === 'categoría') {
      return 'Al desactivar esta categoría, todos sus productos asociados se ocultarán del catálogo.'
    }
    return 'Este producto dejará de ser visible en el catálogo.'
  }

  const getTipoLabel = () => {
    const t = tipo.toLowerCase()
    if (t === 'rubro') return 'Rubro'
    if (t === 'categoria' || t === 'categoría') return 'Categoría'
    return 'Producto'
  }

  return (
    <div
      id="modal-confirmacion-desactivacion"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-desactivar-titulo"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 overflow-hidden transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado con botón de cerrar */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {paso === 1 ? (
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <Info className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  Paso {paso} de 2
                </span>
              </div>
              <h4
                id="modal-desactivar-titulo"
                className="text-base font-bold text-gray-900 mt-0.5"
              >
                {paso === 1 ? `Aviso de Desactivación` : `Confirmación Final`}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal según el paso actual */}
        <div className="py-5">
          {paso === 1 ? (
            <div className="space-y-4">
              {nombreElemento && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium">
                    {getTipoLabel()} a desactivar:
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 break-words">
                    {nombreElemento}
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-sm leading-relaxed flex items-start gap-2.5">
                <span className="text-base leading-none select-none">ℹ️</span>
                <p className="font-medium">{getMensajePaso1()}</p>
              </div>

              <p className="text-xs text-gray-500">
                Podrás reactivar este elemento en cualquier momento desde este mismo panel.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-950 text-sm leading-relaxed flex items-start gap-2.5">
                <span className="text-base leading-none select-none">⚠️</span>
                <p className="font-semibold">
                  Esta acción ocultará los elementos inmediatamente. ¿Confirmás la desactivación?
                </p>
              </div>

              {nombreElemento && (
                <p className="text-xs text-gray-600">
                  Elemento afectado:{' '}
                  <strong className="text-gray-900 font-semibold">{nombreElemento}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción del Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            id="modal-btn-cancelar-desactivacion"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          {paso === 1 ? (
            <button
              type="button"
              id="modal-btn-continuar-desactivacion"
              onClick={() => setPaso(2)}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="modal-btn-confirmar-desactivacion"
              onClick={onConfirm}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Desactivando...</span>
                </>
              ) : (
                <span>Sí, desactivar</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
