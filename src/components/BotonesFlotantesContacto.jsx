import { useState, useEffect } from 'react'
import { MessageCircle, Mail, MapPin } from 'lucide-react'

/**
 * Botones flotantes de contacto (PASO 8):
 * - Apilados en el rincón abajo-izquierda para no colisionar con el botón flotante de 'Presupuesto' (abajo-derecha).
 * - Enlaces directos a:
 *   1. WhatsApp (+54 9 261 243-0105)
 *   2. Email (depositobombal.sa@hotmail.com)
 *   3. Google Maps (Chile 171, Luján de Cuyo, Mendoza)
 * - Accesibilidad completa con aria-label y títulos claros.
 * - Desaparece al llegar al footer en desktop y permanece oculto en mobile/tablet.
 */
export default function BotonesFlotantesContacto() {
  const WHATSAPP_URL =
    'https://wa.me/5492612430105?text=Hola%20Dep%C3%B3sito%20Bombal%2C%20quisiera%20hacer%20una%20consulta.'
  const EMAIL_URL = 'mailto:depositobombal.sa@hotmail.com'
  const MAPS_URL =
    'https://www.google.com/maps/search/?api=1&query=Chile+171%2C+Luj%C3%A1n+de+Cuyo%2C+Mendoza'

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
    <aside
      aria-label="Accesos directos de contacto"
      className={`hidden lg:flex fixed bottom-6 left-4 sm:left-6 z-40 flex-col items-start gap-2.5 transition-all duration-300 ease-in-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      {/* Botón WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir chat de WhatsApp con Depósito Bombal"
        title="Contactanos por WhatsApp (+54 9 261 243-0105)"
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="sr-only">WhatsApp Depósito Bombal</span>
        {/* Tooltip en desktop */}
        <span className="hidden md:group-hover:inline-block absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-md pointer-events-none transition-opacity">
          WhatsApp: +54 9 261 243-0105
        </span>
      </a>

      {/* Botón Email */}
      <a
        href={EMAIL_URL}
        aria-label="Enviar correo electrónico a Depósito Bombal"
        title="Envianos un email (depositobombal.sa@hotmail.com)"
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
      >
        <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="sr-only">Email Depósito Bombal</span>
        {/* Tooltip en desktop */}
        <span className="hidden md:group-hover:inline-block absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-md pointer-events-none transition-opacity">
          depositobombal.sa@hotmail.com
        </span>
      </a>

      {/* Botón Google Maps */}
      <a
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver ubicación de Depósito Bombal en Google Maps"
        title="Ubicación en Google Maps (Chile 171, Luján de Cuyo, Mendoza)"
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      >
        <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="sr-only">Google Maps Depósito Bombal</span>
        {/* Tooltip en desktop */}
        <span className="hidden md:group-hover:inline-block absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-md pointer-events-none transition-opacity">
          Chile 171, Luján de Cuyo
        </span>
      </a>
    </aside>
  )
}
