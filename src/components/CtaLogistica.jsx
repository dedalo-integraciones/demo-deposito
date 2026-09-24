import { useState, useEffect, useRef } from 'react'
import {
  Truck,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Boxes,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { getRubrosActivos } from '../services/rubrosService.js'
import {
  sanitizeText,
  escapeHtml,
  checkRateLimit,
  recordSubmitTimestamp,
} from '../utils/security.js'

export default function CtaLogistica() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [rubros, setRubros] = useState([])
  const [rubroSelect, setRubroSelect] = useState('')
  const [rubroTextoLibre, setRubroTextoLibre] = useState('')

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    mensaje: '',
    _honey: '',
  })

  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('')
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

  const sectionRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.12 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

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
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cálculo de desplazamiento y opacidad reactivos al scroll UP / DOWN
  let translateY = 0
  let scrollOpacity = 1
  if (sectionRef.current) {
    const rect = sectionRef.current.getBoundingClientRect()
    const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const centerOffset = (viewHeight / 2) - (rect.top + rect.height / 2)
    if (centerOffset > 0) {
      const ratio = Math.min(centerOffset / 450, 1)
      translateY = ratio * -28
      scrollOpacity = Math.max(1 - ratio * 0.85, 0.15)
    }
  }

  // Cargar rubros para el selector dinámico
  useEffect(() => {
    let isMounted = true
    async function cargarRubros() {
      try {
        const data = await getRubrosActivos()
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setRubros(data)
        }
      } catch (err) {
        console.error('[CtaLogistica] Error cargando rubros:', err)
      }
    }
    cargarRubros()
    return () => {
      isMounted = false
    }
  }, [])

  // Control de tecla Escape y bloqueo de scroll al abrir el modal
  useEffect(() => {
    if (!isModalOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen])

  // Timer regresivo para rate limit
  useEffect(() => {
    if (rateLimitSeconds <= 0) return
    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [rateLimitSeconds])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Obtener el rubro efectivo (selector o texto libre)
  const getEffectiveRubro = () => {
    if (rubros.length === 0 || rubroSelect === '__otro__') {
      return rubroTextoLibre.trim()
    }
    return rubroSelect.trim()
  }

  // Validación en cliente (requeridos + maxlength por campo)
  const validateForm = () => {
    const errors = {}

    const cleanNombre = sanitizeText(formData.nombre)
    if (!cleanNombre) {
      errors.nombre = 'El Nombre o Razón Social es obligatorio'
    } else if (cleanNombre.length > 100) {
      errors.nombre = 'Máximo 100 caracteres'
    }

    const cleanEmail = sanitizeText(formData.email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!cleanEmail) {
      errors.email = 'El email es obligatorio'
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Ingresá un email válido'
    } else if (cleanEmail.length > 100) {
      errors.email = 'Máximo 100 caracteres'
    }

    const cleanTelefono = sanitizeText(formData.telefono)
    if (!cleanTelefono) {
      errors.telefono = 'El teléfono es obligatorio'
    } else if (cleanTelefono.length > 30) {
      errors.telefono = 'Máximo 30 caracteres'
    }

    const cleanDireccion = sanitizeText(formData.direccion)
    if (!cleanDireccion) {
      errors.direccion = 'La dirección o localidad es obligatoria'
    } else if (cleanDireccion.length > 150) {
      errors.direccion = 'Máximo 150 caracteres'
    }

    const effectiveRubro = getEffectiveRubro()
    if (!effectiveRubro) {
      errors.rubro = 'Indicá el rubro de tu actividad'
    } else if (effectiveRubro.length > 100) {
      errors.rubro = 'Máximo 100 caracteres'
    }

    const cleanMensaje = sanitizeText(formData.mensaje)
    if (!cleanMensaje) {
      errors.mensaje = 'El mensaje o propuesta es obligatorio'
    } else if (cleanMensaje.length > 500) {
      errors.mensaje = 'El mensaje no puede superar los 500 caracteres'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 1. Detección honeypot
    if (formData._honey) {
      console.warn('Spam detectado via honeypot')
      return
    }

    // 2. Validación de campos
    if (!validateForm()) {
      return
    }

    // 3. Rate limiting (mínimo 60 s entre envíos)
    const rateCheck = checkRateLimit('logistica', 60)
    if (!rateCheck.allowed) {
      setRateLimitSeconds(rateCheck.remainingSeconds)
      setSubmitStatus('error')
      setStatusMessage(
        `Por favor, esperá ${rateCheck.remainingSeconds} segundos antes de enviar otra solicitud.`
      )
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const nombreLimpio = escapeHtml(sanitizeText(formData.nombre))
      const emailLimpio = escapeHtml(sanitizeText(formData.email))
      const telefonoLimpio = escapeHtml(sanitizeText(formData.telefono))
      const direccionLimpia = escapeHtml(sanitizeText(formData.direccion))
      const rubroLimpio = escapeHtml(sanitizeText(getEffectiveRubro()))
      const mensajeLimpio = escapeHtml(sanitizeText(formData.mensaje))

      const recipientEmail =
        import.meta.env.VITE_FORMSUBMIT_EMAIL || 'depositobombal.sa@hotmail.com'

      const payload = {
        _subject: 'Solicitud Logística',
        _honey: '',
        _captcha: 'false',
        'Nombre o Razón Social': nombreLimpio,
        Email: emailLimpio,
        Teléfono: telefonoLimpio,
        'Dirección / Localidad': direccionLimpia,
        Rubro: rubroLimpio,
        'Mensaje / Propuesta': mensajeLimpio,
      }

      const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        recordSubmitTimestamp('logistica')
        setSubmitStatus('success')
        setStatusMessage(
          '¡Solicitud logística enviada con éxito! Nos contactaremos a la brevedad para coordinar la alianza.'
        )
        // Limpiar formulario en caso de éxito
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          direccion: '',
          mensaje: '',
          _honey: '',
        })
        setRubroSelect('')
        setRubroTextoLibre('')
      } else {
        throw new Error('Respuesta no satisfactoria de FormSubmit')
      }
    } catch (err) {
      console.error('[CtaLogistica] Error al enviar formulario:', err)
      setSubmitStatus('error')
      setStatusMessage(
        'Ocurrió un inconveniente al enviar la solicitud. Por favor verificá tu conexión o intentá nuevamente.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // No reseteamos submitStatus si fue exitoso para que el usuario pueda ver la confirmación si reabre
  }

  return (
    <>
      {/* Sección Visual Parallax: Únicamente mensaje de propuesta de valor y botón CTA */}
      <section
        id="cta-1"
        ref={sectionRef}
        className="relative w-full py-20 sm:py-28 bg-fixed bg-center bg-cover overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.84), rgba(17, 24, 39, 0.88)), url('/logistica.webp')`,
        }}
      >
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 relative z-10">
          <div
            className="max-w-4xl mx-auto text-center text-white space-y-7 transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(0, ${translateY}px, 0)`,
              opacity: scrollOpacity,
            }}
          >
            {/* Badge - Escalonado 1 */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold tracking-wide uppercase shadow-xs transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '150ms' }}
            >
              <Truck className="w-3.5 h-3.5 text-red-400" />
              <span>Logística & Distribución Regional</span>
            </div>

            {/* Título - Escalonado 2 */}
            <h2
              className={`text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              Alianza Estratégica con Productores y Fabricantes
            </h2>

            {/* Mensaje de propuesta de valor - Escalonado 3 */}
            <p
              className={`text-base sm:text-lg lg:text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto font-normal transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '450ms' }}
            >
              Atención comercial. Atención de pedidos mayoristas, minorista con entrega coordinada en Mendoza.
            </p>

            {/* 3 Pilares destacados - Escalonado 4 */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2 text-left max-w-3xl mx-auto transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Flota de transporte propia</h3>
                <p className="text-xs text-gray-300 leading-normal">
                  Entregas programadas y distribución directa en puntos de venta y depósitos.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Capacidad de acopio</h3>
                <p className="text-xs text-gray-300 leading-normal">
                  Depósito central en Luján de Cuyo acondicionado para rotación ágil y seguro.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Canal comercial activo</h3>
                <p className="text-xs text-gray-300 leading-normal">
                  Cobertura en ferretería, agro, construcción e insumos en todo Mendoza.
                </p>
              </div>
            </div>

            {/* Botón CTA para abrir el modal - Escalonado 5 */}
            <div
              className={`pt-3 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '750ms' }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-primary shadow-xl hover:shadow-2xl text-sm sm:text-base"
              >
                <Send className="w-4 h-4" />
                <span>Consultar Alianza Logística</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal con Formulario Completo de Solicitud Logística */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-logistica-titulo"
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal con botón X */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[var(--primary)] border border-red-100 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="modal-logistica-titulo"
                    className="text-lg sm:text-xl font-bold text-[var(--text)]"
                  >
                    Solicitud de Alianza Logística
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Completá los datos y nuestro equipo comercial se comunicará para evaluar la distribución.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Cerrar modal"
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal con scroll */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {/* Feedback de Éxito */}
              {submitStatus === 'success' && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-fadeIn">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold mb-1">¡Solicitud recibida con éxito!</p>
                    <p className="text-emerald-700 leading-relaxed">{statusMessage}</p>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="btn-secondary"
                      >
                        Cerrar ventana
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmitStatus(null)}
                        className="btn-tertiary"
                      >
                        Enviar otra solicitud
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback de Error */}
              {submitStatus === 'error' && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold mb-1">Error al enviar la solicitud</p>
                    <p className="text-red-700 leading-relaxed">{statusMessage}</p>
                  </div>
                </div>
              )}

              {/* Aviso de Rate Limit */}
              {rateLimitSeconds > 0 && (
                <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Esperá <strong>{rateLimitSeconds} s</strong> para enviar otra solicitud.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Honeypot Oculto */}
                <input
                  type="text"
                  name="_honey"
                  value={formData._honey}
                  onChange={handleInputChange}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Nombre / Razón Social */}
                <div>
                  <label
                    htmlFor="modal-logistica-nombre"
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Nombre o Razón Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-logistica-nombre"
                    type="text"
                    name="nombre"
                    maxLength={100}
                    required
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: AgroIndustrias Cuyo S.A. o Juan Pérez"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                      formErrors.nombre ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'
                    }`}
                  />
                  {formErrors.nombre && (
                    <span className="text-[11px] text-red-600 font-medium block mt-1">
                      {formErrors.nombre}
                    </span>
                  )}
                </div>

                {/* Email y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="modal-logistica-email"
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-logistica-email"
                      type="email"
                      name="email"
                      maxLength={100}
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contacto@empresa.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                        formErrors.email ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'
                      }`}
                    />
                    {formErrors.email && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {formErrors.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="modal-logistica-telefono"
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      Teléfono / Móvil <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-logistica-telefono"
                      type="tel"
                      name="telefono"
                      maxLength={30}
                      required
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="Ej: +54 9 261 1234567"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                        formErrors.telefono
                          ? 'border-red-400 bg-red-50/30'
                          : 'border-gray-300 bg-gray-50/50'
                      }`}
                    />
                    {formErrors.telefono && (
                      <span className="text-[11px] text-red-600 font-medium block mt-1">
                        {formErrors.telefono}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dirección / Localidad */}
                <div>
                  <label
                    htmlFor="modal-logistica-direccion"
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Dirección / Localidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-logistica-direccion"
                    type="text"
                    name="direccion"
                    maxLength={150}
                    required
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Ubicación de la fábrica, planta o depósito de origen"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                      formErrors.direccion ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'
                    }`}
                  />
                  {formErrors.direccion && (
                    <span className="text-[11px] text-red-600 font-medium block mt-1">
                      {formErrors.direccion}
                    </span>
                  )}
                </div>

                {/* Rubro (Selector con rubros existentes o texto libre) */}
                <div>
                  <label
                    htmlFor="modal-logistica-rubro"
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Rubro de actividad <span className="text-red-500">*</span>
                  </label>

                  {rubros.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        id="modal-logistica-rubro"
                        value={rubroSelect}
                        onChange={(e) => {
                          setRubroSelect(e.target.value)
                          if (formErrors.rubro) {
                            setFormErrors((prev) => ({ ...prev, rubro: null }))
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                          formErrors.rubro ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccioná un rubro...</option>
                        {rubros.map((r) => (
                          <option key={r.id} value={r.descripcion}>
                            {r.descripcion}
                          </option>
                        ))}
                        <option value="__otro__">Otro rubro / Especificar manualmente...</option>
                      </select>

                      {rubroSelect === '__otro__' && (
                        <input
                          type="text"
                          maxLength={100}
                          value={rubroTextoLibre}
                          onChange={(e) => {
                            setRubroTextoLibre(e.target.value)
                            if (formErrors.rubro) {
                              setFormErrors((prev) => ({ ...prev, rubro: null }))
                            }
                          }}
                          placeholder="Ingresá el rubro de tus productos..."
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all animate-fadeIn"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      id="modal-logistica-rubro"
                      type="text"
                      maxLength={100}
                      value={rubroTextoLibre}
                      onChange={(e) => {
                        setRubroTextoLibre(e.target.value)
                        if (formErrors.rubro) {
                          setFormErrors((prev) => ({ ...prev, rubro: null }))
                        }
                      }}
                      placeholder="Ej: Herramientas, Construcción, Plásticos, Metalúrgica..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                        formErrors.rubro ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'
                      }`}
                    />
                  )}

                  {formErrors.rubro && (
                    <span className="text-[11px] text-red-600 font-medium block mt-1">
                      {formErrors.rubro}
                    </span>
                  )}
                </div>

                {/* Mensaje / Propuesta */}
                <div>
                  <label
                    htmlFor="modal-logistica-mensaje"
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Mensaje o propuesta de distribución <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="modal-logistica-mensaje"
                    name="mensaje"
                    rows={3}
                    maxLength={500}
                    required
                    value={formData.mensaje}
                    onChange={handleInputChange}
                    placeholder="Detallá los tipos de productos, volúmenes estimados o zonas de interés..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all resize-none ${
                      formErrors.mensaje ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'
                    }`}
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
                    {formErrors.mensaje ? (
                      <span className="text-red-600 font-medium">{formErrors.mensaje}</span>
                    ) : (
                      <span>Breve descripción de los insumos o productos</span>
                    )}
                    <span>{formData.mensaje.length}/500</span>
                  </div>
                </div>

                {/* Botones de acción del modal */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || rateLimitSeconds > 0}
                    className="btn-primary w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Enviando...
                      </span>
                    ) : rateLimitSeconds > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Esperar {rateLimitSeconds}s
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Enviar Solicitud
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
