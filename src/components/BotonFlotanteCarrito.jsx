import { useState, useEffect } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { usePresupuesto } from '../context/PresupuestoContext.jsx'

export default function BotonFlotanteCarrito() {
  const { totalProducts, openDrawer } = usePresupuesto()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // IntersectionObserver para ocultar cuando el footer entra en pantalla (asíncrono, sin forzar reflow)
    const footer = document.querySelector('footer')
    if (!footer) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          setIsVisible(!entry.isIntersecting)
        }
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0,
      }
    )

    observer.observe(footer)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      id="btn-flotante-presupuesto"
      className={`hidden lg:block fixed bottom-6 right-6 z-40 transition-all duration-300 ease-in-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Abrir carrito de presupuesto"
        className="btn-primary shadow-xl hover:shadow-2xl"
      >
        <div className="relative">
          <FileSpreadsheet className="w-5 h-5" />
          {totalProducts > 0 && (
            <span className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white text-[var(--primary)] font-extrabold text-[11px] rounded-full flex items-center justify-center border-2 border-[var(--primary)] shadow-xs">
              {totalProducts}
            </span>
          )}
        </div>
        <span>
          Presupuesto
        </span>
      </button>
    </div>
  )
}
