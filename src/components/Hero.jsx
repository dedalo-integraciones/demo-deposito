import { useState, useEffect } from 'react'
import { Sparkles, MessageCircle, ArrowUpRight } from 'lucide-react'

export default function Hero() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cálculo de desplazamiento y opacidad suave al hacer scroll down / scroll up
  const maxScroll = 380
  const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1)
  const translateY = scrollRatio * -32
  const scrollOpacity = Math.max(1 - scrollRatio * 1.2, 0)

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-neutral-100 flex items-center justify-start"
      style={{
        minHeight: 'calc(100vh - var(--header-height))',
        height: 'calc(100dvh - var(--header-height))',
      }}
    >
      {/* Imagen de fondo LCP: hero-mob.webp exclusivamente en modo mobile (<= 768px) y hero.webp en desktop */}
      <picture className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <source media="(max-width: 768px)" srcSet="/hero-mob.webp" />
        <img
          src="/hero.webp"
          alt="Depósito Bombal — Instalaciones y logística"
          className="w-full h-full object-cover object-top"
          fetchPriority="high"
          decoding="sync"
        />
      </picture>

      {/* Contenido alineado a la izquierda */}
      <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-6 sm:py-10 flex flex-col justify-center items-start max-w-5xl text-left">
        {/* Cuadro bajo el texto en traslúcido con respuesta fluida a scroll UP / DOWN */}
        <div
          className="w-full max-w-2xl bg-white/40 sm:bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl flex flex-col items-start text-left transition-all duration-300 ease-out"
          style={{
            transform: `translate3d(0, ${translateY}px, 0)`,
            opacity: scrollOpacity,
          }}
        >
          {/* Insignia - Escalonado 1 */}
          <div className="hero-fade-item hero-delay-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/60 text-[var(--primary)] border border-white/70 mb-4 sm:mb-5 shadow-2xs backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Plataforma Catálogo Online</span>
          </div>

          {/* Título principal - Escalonado 2 */}
          <h1 className="hero-fade-item hero-delay-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-950 mb-3 sm:mb-4 leading-tight text-left">
            Depósito <span className="text-[var(--primary)]">Bombal</span>
          </h1>

          {/* Bajada descriptiva - Escalonado 3 */}
          <p className="hero-fade-item hero-delay-3 text-sm sm:text-base md:text-lg text-gray-900 font-medium leading-relaxed mb-6 sm:mb-8 text-left">
            Catálogo online. Venta, distribución mayorista y minorista en Mendoza. Arma tu lista, solicita tu presupuesto personalizado sin compromiso.
          </p>

          {/* CTA 'Consultar por WhatsApp' - Escalonado 4 */}
          <div className="hero-fade-item hero-delay-4 text-left">
            <a
              href="https://wa.me/5492612430105?text=Hola%2C%20quisiera%20solicitar%20un%20presupuesto"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp shadow-xl hover:shadow-2xl"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Consultar por WhatsApp</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
