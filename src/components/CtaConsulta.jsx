import { useState, useEffect } from 'react'
import {
  MessageSquare,
  MessageCircle,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  HelpCircle,
} from 'lucide-react'
import {
  sanitizeText,
  escapeHtml,
  checkRateLimit,
  recordSubmitTimestamp,
} from '../utils/security.js'

export default function CtaConsulta() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: '',
    _honey: '',
  })

  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('')
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)

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

  // Timer regresivo para rate limiting
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

  // Validación en cliente (requeridos + límites de longitud)
  const validateForm = () => {
    const errors = {}

    const cleanNombre = sanitizeText(formData.nombre)
    if (!cleanNombre) {
      errors.nombre = 'El nombre es obligatorio'
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
      errors.telefono = 'El teléfono de contacto es obligatorio'
    } else if (cleanTelefono.length > 30) {
      errors.telefono = 'Máximo 30 caracteres'
    }

    const cleanMensaje = sanitizeText(formData.mensaje)
    if (!cleanMensaje) {
      errors.mensaje = 'El mensaje de tu consulta es obligatorio'
    } else if (cleanMensaje.length > 500) {
      errors.mensaje = 'El mensaje no puede superar los 500 caracteres'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 1. Detección de bot por honeypot
    if (formData._honey) {
      console.warn('Spam detectado via honeypot')
      return
    }

    // 2. Validación de campos
    if (!validateForm()) {
      return
    }

    // 3. Rate limiting (mínimo 60 s entre envíos)
    const rateCheck = checkRateLimit('consulta', 60)
    if (!rateCheck.allowed) {
      setRateLimitSeconds(rateCheck.remainingSeconds)
      setSubmitStatus('error')
      setStatusMessage(
        `Por favor, esperá ${rateCheck.remainingSeconds} segundos antes de enviar otra consulta.`
      )
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const nombreLimpio = escapeHtml(sanitizeText(formData.nombre))
      const emailLimpio = escapeHtml(sanitizeText(formData.email))
      const telefonoLimpio = escapeHtml(sanitizeText(formData.telefono))
      const mensajeLimpio = escapeHtml(sanitizeText(formData.mensaje))

      const recipientEmail =
        import.meta.env.VITE_FORMSUBMIT_EMAIL || 'depositobombal.sa@hotmail.com'

      const payload = {
        _subject: 'Consulta',
        _honey: '',
        _captcha: 'false',
        Nombre: nombreLimpio,
        Email: emailLimpio,
        Teléfono: telefonoLimpio,
        Mensaje: mensajeLimpio,
      }

      const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && (data.success === 'true' || data.success === true || response.status === 200)) {
        recordSubmitTimestamp('consulta')
        setSubmitStatus('success')
        setStatusMessage('¡Consulta enviada con éxito! Nos comunicaremos con vos a la brevedad.')
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          mensaje: '',
          _honey: '',
        })
        setFormErrors({})
      } else {
        throw new Error(data.message || 'No se pudo enviar el mensaje.')
      }
    } catch (err) {
      console.error('[CtaConsulta] Error al enviar formulario:', err)
      setSubmitStatus('error')
      setStatusMessage(
        'Hubo un inconveniente al enviar tu consulta. Podés escribirnos también directamente por WhatsApp.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenModal = () => {
    setSubmitStatus(null)
    setStatusMessage('')
    setIsModalOpen(true)
  }

  return (
    <section
      id="atencion-cliente"
      className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-16 md:py-20 bg-gray-50 border-t border-b border-gray-200"
    >
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-[var(--primary)] border border-red-200 mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Atención al cliente</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight">
          ¿Tenés consultas sobre nuestro <span className="text-[var(--primary)]">catálogo</span>?
        </h2>

        <p className="mt-3 text-base text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
          Nuestro equipo comercial está disponible para asesorarte sobre disponibilidad, especificaciones de productos, modalidades de entrega o cualquier requerimiento específico.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleOpenModal}
            className="btn-primary w-full sm:w-auto shadow-md hover:shadow-lg"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Hacer una Consulta</span>
          </button>

          <a
            href="https://wa.me/5492612430105?text=Hola%2C%20quisiera%20hacer%20una%20consulta%20general"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp w-full sm:w-auto shadow-md hover:shadow-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Modal Formulario 'Consulta' */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-consulta-title"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[var(--primary)] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    id="modal-consulta-title"
                    className="font-bold text-base text-[var(--text)]"
                  >
                    Formulario de Consulta
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Depósito Bombal responderá a tu mensaje
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              {submitStatus === 'success' ? (
                <div className="py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-[var(--text)] mb-2">
                    ¡Consulta enviada!
                  </h4>
                  <p className="text-sm text-gray-600 mb-6">
                    {statusMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cerrar ventana
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Honeypot anti-spam oculto */}
                  <input
                    type="text"
                    name="_honey"
                    value={formData._honey}
                    onChange={handleInputChange}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Feedback de error o rate limit */}
                  {submitStatus === 'error' && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-semibold">{statusMessage}</p>
                        {rateLimitSeconds > 0 && (
                          <div className="flex items-center gap-1 mt-1 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Esperá {rateLimitSeconds}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Campo: Nombre */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="consulta-nombre"
                        className="text-xs font-bold text-gray-700"
                      >
                        Nombre completo <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {formData.nombre.length}/100
                      </span>
                    </div>
                    <input
                      id="consulta-nombre"
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      maxLength={100}
                      placeholder="Tu nombre y apellido"
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                        formErrors.nombre
                          ? 'border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-[var(--primary)] focus:ring-red-100'
                      }`}
                    />
                    {formErrors.nombre && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {formErrors.nombre}
                      </p>
                    )}
                  </div>

                  {/* Campo: Email */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="consulta-email"
                        className="text-xs font-bold text-gray-700"
                      >
                        Correo electrónico <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {formData.email.length}/100
                      </span>
                    </div>
                    <input
                      id="consulta-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      maxLength={100}
                      placeholder="ejemplo@correo.com"
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                        formErrors.email
                          ? 'border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-[var(--primary)] focus:ring-red-100'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Campo: Teléfono */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="consulta-telefono"
                        className="text-xs font-bold text-gray-700"
                      >
                        Teléfono / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {formData.telefono.length}/30
                      </span>
                    </div>
                    <input
                      id="consulta-telefono"
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      maxLength={30}
                      placeholder="+54 9 261 123-4567"
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                        formErrors.telefono
                          ? 'border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-[var(--primary)] focus:ring-red-100'
                      }`}
                    />
                    {formErrors.telefono && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {formErrors.telefono}
                      </p>
                    )}
                  </div>

                  {/* Campo: Mensaje */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="consulta-mensaje"
                        className="text-xs font-bold text-gray-700"
                      >
                        Mensaje <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {formData.mensaje.length}/500
                      </span>
                    </div>
                    <textarea
                      id="consulta-mensaje"
                      name="mensaje"
                      rows={4}
                      value={formData.mensaje}
                      onChange={handleInputChange}
                      maxLength={500}
                      placeholder="Escribí aquí tu consulta o duda sobre los productos..."
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all resize-none ${
                        formErrors.mensaje
                          ? 'border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-[var(--primary)] focus:ring-red-100'
                      }`}
                    />
                    {formErrors.mensaje && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {formErrors.mensaje}
                      </p>
                    )}
                  </div>

                  {/* Botones del formulario */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || rateLimitSeconds > 0}
                      className="btn-primary"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Consulta</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
