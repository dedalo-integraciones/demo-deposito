import { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  Mail,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Plus,
  Minus,
  FileSpreadsheet,
  RotateCcw,
  PlusCircle,
} from 'lucide-react'
import { usePresupuesto } from '../context/PresupuestoContext.jsx'
import {
  sanitizeText,
  escapeHtml,
  checkRateLimit,
  recordSubmitTimestamp,
} from '../utils/security.js'
import { EMPRESA } from '../config/empresa.js'

function formatFechaLegible(isoDate) {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

export default function CarritoDrawer() {
  const {
    itemsList,
    itemsDisponiblesList,
    estado,
    fechaGuardado,
    fechaEnvio,
    canal,
    totalProducts,
    totalDisponibles,
    isDrawerOpen,
    closeDrawer,
    updateCantidad,
    removeItem,
    clearCart,
    iniciarNuevaLista,
    reusarComoBorrador,
    marcarEnviado,
  } = usePresupuesto()

  // Form fields
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    mensaje: '',
    _honey: '', // Honeypot anti-spam
  })

  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('')
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [whatsappNotice, setWhatsappNotice] = useState(null) // { url: string } | null
  const [mostrarAvisoBorrador, setMostrarAvisoBorrador] = useState(true)

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer()
      }
    }
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawerOpen, closeDrawer])

  // Temporizador de rate limit
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
    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Validación en cliente compartida e idéntica para ambos canales
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
      errors.telefono = 'El teléfono es obligatorio'
    } else if (cleanTelefono.length > 30) {
      errors.telefono = 'Máximo 30 caracteres'
    }

    const cleanDireccion = sanitizeText(formData.direccion)
    if (!cleanDireccion) {
      errors.direccion = 'La dirección es obligatoria'
    } else if (cleanDireccion.length > 150) {
      errors.direccion = 'Máximo 150 caracteres'
    }

    if (formData.mensaje && formData.mensaje.length > 500) {
      errors.mensaje = 'El mensaje no puede superar los 500 caracteres'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Canal 1: Enviar por Email (FormSubmit)
  const handleEnviarEmail = async (e) => {
    if (e) e.preventDefault()
    setWhatsappNotice(null)

    // 1. Detección honeypot (si el bot rellenó el campo oculto)
    if (formData._honey) {
      console.warn('Spam detectado via honeypot')
      return
    }

    // 2. Validación de ítems disponibles
    if (!itemsDisponiblesList || itemsDisponiblesList.length === 0) {
      setSubmitStatus('error')
      setStatusMessage('No hay productos disponibles seleccionados para solicitar presupuesto.')
      return
    }

    // 3. Validación de campos
    if (!validateForm()) {
      return
    }

    // 4. Rate limiting (mínimo 60s entre envíos)
    const rateCheck = checkRateLimit('presupuesto', 60)
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
      // Sanitización anti-XSS de los campos del formulario
      const nombreLimpio = escapeHtml(sanitizeText(formData.nombre))
      const emailLimpio = escapeHtml(sanitizeText(formData.email))
      const telefonoLimpio = escapeHtml(sanitizeText(formData.telefono))
      const direccionLimpia = escapeHtml(sanitizeText(formData.direccion))
      const mensajeLimpio = escapeHtml(sanitizeText(formData.mensaje))

      // Armado de la lista de productos disponibles para el cuerpo del email
      const listaProductosParaEmail = itemsDisponiblesList
        .map((item, index) => {
          const unidadStr = item.obsUnidad ? ` (${item.obsUnidad})` : ''
          return `${index + 1}. [Código: ${item.id}] ${item.descripcion}${unidadStr} - Cantidad: ${item.cantidad}`
        })
        .join('\n')

      const recipientEmail =
        import.meta.env.VITE_FORMSUBMIT_EMAIL || 'depositobombal.sa@hotmail.com'

      const payload = {
        _subject: 'Pedido Presupuesto',
        _honey: '',
        _captcha: 'false',
        Nombre: nombreLimpio,
        Email: emailLimpio,
        Teléfono: telefonoLimpio,
        Dirección: direccionLimpia,
        Mensaje: mensajeLimpio || 'Sin mensaje adicional',
        'Lista de Productos (Uso Interno)': listaProductosParaEmail,
        'Total de Artículos': itemsDisponiblesList.length,
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
        // Éxito: registrar timestamp para rate limiting y marcar lista como enviada
        recordSubmitTimestamp('presupuesto')
        setSubmitStatus('success')
        setStatusMessage(
          '¡Tu pedido de presupuesto fue enviado con éxito por email! Nos comunicaremos a la brevedad.'
        )
        // Marcar estado como 'enviado' conservando la lista
        marcarEnviado('email')
      } else {
        throw new Error('Respuesta no satisfactoria de FormSubmit')
      }
    } catch (err) {
      console.error('[CarritoDrawer] Error al enviar presupuesto:', err)
      setSubmitStatus('error')
      setStatusMessage(
        'Ocurrió un inconveniente al enviar la solicitud. Por favor verificá tu conexión o intentá nuevamente.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Canal 2: Enviar por WhatsApp
  const handleEnviarWhatsApp = (e) => {
    if (e) e.preventDefault()
    setSubmitStatus(null)

    // 1. Detección honeypot
    if (formData._honey) {
      console.warn('Spam detectado via honeypot')
      return
    }

    // 2. Validación de ítems disponibles
    if (!itemsDisponiblesList || itemsDisponiblesList.length === 0) {
      setSubmitStatus('error')
      setStatusMessage('No hay productos disponibles seleccionados para solicitar presupuesto.')
      setWhatsappNotice(null)
      return
    }

    // 3. Validación de campos
    if (!validateForm()) {
      setWhatsappNotice(null)
      return
    }

    // Sanitización de datos
    const nombreLimpio = sanitizeText(formData.nombre)
    const emailLimpio = sanitizeText(formData.email)
    const telefonoLimpio = sanitizeText(formData.telefono)
    const direccionLimpia = sanitizeText(formData.direccion)
    const mensajeLimpio = sanitizeText(formData.mensaje)

    // Construcción del mensaje con formato WhatsApp limpio
    const lines = []
    lines.push('*PEDIDO DE PRESUPUESTO - Depósito Bombal*')
    lines.push('')
    lines.push('*Datos del Cliente:*')
    lines.push(`- *Nombre / Razón Social:* ${nombreLimpio}`)
    lines.push(`- *Teléfono:* ${telefonoLimpio}`)
    lines.push(`- *Email:* ${emailLimpio}`)
    lines.push(`- *Dirección:* ${direccionLimpia}`)
    lines.push('')
    lines.push('*Detalle del Pedido:*')
    itemsDisponiblesList.forEach((item, index) => {
      const unidadStr = item.obsUnidad ? ` (${item.obsUnidad})` : ''
      const cant = item.cantidad || 1
      lines.push(`${index + 1}. ${item.descripcion}${unidadStr} - *Cant:* ${cant}`)
    })
    if (mensajeLimpio) {
      lines.push('')
      lines.push('*Observaciones:*')
      lines.push(mensajeLimpio)
    }

    const fullMessage = lines.join('\n')
    const whatsappUrl = `https://wa.me/${EMPRESA.whatsappNumero}?text=${encodeURIComponent(fullMessage)}`

    // Abrir en pestaña nueva
    window.open(whatsappUrl, '_blank')

    // Marcar como enviado por WhatsApp conservando los ítems
    marcarEnviado('whatsapp')

    // Mostrar aviso con enlace directo debajo de observaciones
    setWhatsappNotice({
      url: whatsappUrl,
    })
  }

  if (!isDrawerOpen) return null

  const canalNombre = canal === 'whatsapp' ? 'WhatsApp' : 'Email'

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={closeDrawer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-presupuesto-titulo"
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Carrito */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[var(--primary)] flex items-center justify-center border border-red-200">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="drawer-presupuesto-titulo"
                className="text-base font-bold text-[var(--text)] leading-none"
              >
                Carrito de Presupuesto
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {totalProducts} {totalProducts === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                {totalProducts !== totalDisponibles && (
                  <span className="text-amber-700 font-medium ml-1">
                    ({totalDisponibles} disponible{totalDisponibles === 1 ? '' : 's'})
                  </span>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Cerrar panel de presupuesto"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* BANNER: Estado 'enviado' */}
          {estado === 'enviado' && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col gap-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm flex-1">
                  <p className="font-bold text-blue-900 leading-snug">
                    Esta lista se envió el {formatFechaLegible(fechaEnvio)} por {canalNombre}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100">
                <button
                  type="button"
                  id="btn-iniciar-lista-nueva"
                  onClick={iniciarNuevaLista}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 hover:bg-blue-100/70 text-blue-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Iniciar lista nueva</span>
                </button>
                <button
                  type="button"
                  id="btn-reusar-borrador"
                  onClick={reusarComoBorrador}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reusar como borrador</span>
                </button>
              </div>
            </div>
          )}

          {/* AVISO: Estado 'borrador' */}
          {estado === 'borrador' && itemsList.length > 0 && fechaGuardado && mostrarAvisoBorrador && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-between gap-3 text-xs animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="truncate">
                  Borrador guardado el <strong>{formatFechaLegible(fechaGuardado)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMostrarAvisoBorrador(false)}
                  className="text-gray-600 hover:text-gray-900 font-semibold cursor-pointer underline text-[11px]"
                >
                  Continuar
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 font-semibold cursor-pointer text-[11px]"
                >
                  Vaciar
                </button>
              </div>
            </div>
          )}

          {/* Feedback de Envío Exitoso por Email */}
          {submitStatus === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold mb-1">¡Solicitud recibida!</p>
                <p className="text-emerald-700 leading-relaxed">{statusMessage}</p>
                <button
                  type="button"
                  onClick={() => setSubmitStatus(null)}
                  className="mt-3 text-xs font-bold text-emerald-800 underline cursor-pointer"
                >
                  Cerrar aviso
                </button>
              </div>
            </div>
          )}

          {/* Feedback de Error */}
          {submitStatus === 'error' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold mb-1">No se pudo enviar la solicitud</p>
                <p className="text-red-700 leading-relaxed">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* Rate limiting activo */}
          {rateLimitSeconds > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Tiempo de espera entre envíos por email: <strong>{rateLimitSeconds} s</strong>
              </span>
            </div>
          )}

          {/* -------------------------------------------------------------
              LISTA DE PRODUCTOS SELECCIONADOS (SIN PRECIOS)
              ------------------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Artículos a presupuestar
              </h3>
              {itemsList.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                >
                  Vaciar lista
                </button>
              )}
            </div>

            {itemsList.length > 0 ? (
              <div className="space-y-3">
                {itemsList.map((item) => {
                  const isNoDisponible = Boolean(item.noDisponible)

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-2xs ${
                        isNoDisponible
                          ? 'bg-gray-100/90 border-gray-300 opacity-75'
                          : 'bg-gray-50/60 border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`font-bold text-xs sm:text-sm leading-snug line-clamp-2 ${
                              isNoDisponible ? 'text-gray-500 line-through' : 'text-[var(--text)]'
                            }`}
                          >
                            {item.descripcion}
                          </h4>
                          {isNoDisponible && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              No disponible
                            </span>
                          )}
                        </div>

                        {item.obsUnidad && (
                          <span className="text-[11px] text-[var(--muted)] font-medium block mt-0.5">
                            Unidad: {item.obsUnidad}
                          </span>
                        )}

                        {isNoDisponible && (
                          <span className="text-[11px] text-amber-800 font-medium block mt-0.5">
                            Producto inactivo en el catálogo. Excluido del envío.
                          </span>
                        )}
                      </div>

                      {/* Selector de cantidad + Botón quitar */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isNoDisponible ? (
                          <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateCantidad(item.id, item.cantidad - 1)}
                              disabled={item.cantidad <= 1}
                              aria-label="Disminuir cantidad"
                              className="px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={item.cantidad}
                              onChange={(e) => updateCantidad(item.id, e.target.value)}
                              className="w-11 text-center text-xs font-bold text-[var(--text)] py-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateCantidad(item.id, item.cantidad + 1)}
                              aria-label="Aumentar cantidad"
                              className="px-2 py-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg bg-white transition-colors cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Quitar ${item.descripcion}`}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Quitar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Estado Vacío de la lista */
              <div className="p-8 rounded-xl border border-dashed border-gray-300 text-center bg-gray-50/50">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-sm font-bold text-[var(--text)] mb-1">
                  Tu presupuesto está vacío
                </p>
                <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
                  Seleccioná productos en el catálogo marcando el casillero para solicitar cotización formal.
                </p>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------
              FORMULARIO DE CONTACTO PARA SOLICITUD FORMAL
              ------------------------------------------------------------- */}
          <form id="form-pedido-presupuesto" onSubmit={handleEnviarEmail} className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-t border-gray-200 pt-4">
              Datos de contacto para el presupuesto
            </h3>

            {/* Campo Honeypot Oculto (Anti-bot) */}
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

            {/* Nombre */}
            <div>
              <label htmlFor="input-nombre" className="block text-xs font-bold text-gray-700 mb-1">
                Nombre y Apellido / Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                id="input-nombre"
                type="text"
                name="nombre"
                maxLength={100}
                required
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Juan Pérez o Distribuidora Mendoza"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                  formErrors.nombre ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-white'
                }`}
              />
              {formErrors.nombre && (
                <span className="text-[11px] text-red-600 font-medium block mt-1">
                  {formErrors.nombre}
                </span>
              )}
            </div>

            {/* Email y Teléfono en 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div>
                <label htmlFor="input-email" className="block text-xs font-bold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-email"
                  type="email"
                  name="email"
                  maxLength={100}
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ejemplo@correo.com"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                    formErrors.email ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-white'
                  }`}
                />
                {formErrors.email && (
                  <span className="text-[11px] text-red-600 font-medium block mt-1">
                    {formErrors.email}
                  </span>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label
                  htmlFor="input-telefono"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Teléfono / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-telefono"
                  type="tel"
                  name="telefono"
                  maxLength={30}
                  required
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="Ej: 261 1234567"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                    formErrors.telefono ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-white'
                  }`}
                />
                {formErrors.telefono && (
                  <span className="text-[11px] text-red-600 font-medium block mt-1">
                    {formErrors.telefono}
                  </span>
                )}
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label
                htmlFor="input-direccion"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Dirección / Localidad <span className="text-red-500">*</span>
              </label>
              <input
                id="input-direccion"
                type="text"
                name="direccion"
                maxLength={150}
                required
                value={formData.direccion}
                onChange={handleInputChange}
                placeholder="Calle, número y departamento de entrega"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${
                  formErrors.direccion ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-white'
                }`}
              />
              {formErrors.direccion && (
                <span className="text-[11px] text-red-600 font-medium block mt-1">
                  {formErrors.direccion}
                </span>
              )}
            </div>

            {/* Mensaje */}
            <div>
              <label htmlFor="input-mensaje" className="block text-xs font-bold text-gray-700 mb-1">
                Mensaje u observaciones (opcional)
              </label>
              <textarea
                id="input-mensaje"
                name="mensaje"
                rows={3}
                maxLength={500}
                value={formData.mensaje}
                onChange={handleInputChange}
                placeholder="Aclaraciones sobre entrega, modalidades o consultas adicionales..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all resize-none"
              />
              <div className="flex justify-end text-[10px] text-gray-400 mt-0.5">
                {formData.mensaje.length}/500
              </div>
            </div>

            {/* Aviso tras abrir WhatsApp (debajo de observaciones) */}
            {whatsappNotice && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 animate-fadeIn">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm flex-1">
                  <p className="font-bold text-emerald-900 mb-1">
                    Se abrió WhatsApp con tu pedido listo: dale enviar para completarlo.
                  </p>
                  <p className="text-emerald-800 text-xs mb-2">
                    Si tu navegador bloqueó la ventana o no se abrió automáticamente, podés abrirlo manualmente:
                  </p>
                  <a
                    href={whatsappNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-900 hover:text-emerald-950 underline text-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>Abrir WhatsApp con el pedido</span>
                  </a>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Pie del Drawer con los botones de doble canal de envío (Email y WhatsApp) */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Opción 1: Enviar por email */}
            <button
              type="button"
              id="btn-presupuesto-email"
              onClick={handleEnviarEmail}
              disabled={isSubmitting || totalDisponibles === 0 || rateLimitSeconds > 0}
              className="btn-primary flex-1 !min-h-[42px] !py-2.5 !px-4 !rounded-xl !text-xs sm:!text-sm !font-bold justify-center shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white shrink-0"
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
                  <span>Enviando...</span>
                </span>
              ) : rateLimitSeconds > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Esperar {rateLimitSeconds}s</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Enviar por email</span>
                </span>
              )}
            </button>

            {/* Opción 2: Enviar por WhatsApp */}
            <button
              type="button"
              id="btn-presupuesto-whatsapp"
              onClick={handleEnviarWhatsApp}
              disabled={totalDisponibles === 0}
              className="btn-whatsapp flex-1 !min-h-[42px] !py-2.5 !px-4 !rounded-xl !text-xs sm:!text-sm !font-bold justify-center shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-gray-500">
            Respuesta personalizada sin compromiso comercial.
          </p>
        </div>
      </div>
    </div>
  )
}
