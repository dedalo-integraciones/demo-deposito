/**
 * Utilidades de seguridad para formularios FormSubmit
 * - Sanitización básica y escape anti-XSS
 * - Rate limiting en cliente (mínimo 60 s)
 */

/**
 * Escapa caracteres especiales HTML para prevenir inyección XSS.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitiza una cadena eliminando espacios extras y etiquetas de script.
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return ''
  // Elimina secuencias script y tags HTML sospechosos
  const clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  return clean.trim()
}

/**
 * Verifica si se ha cumplido el tiempo mínimo de rate limiting (60 segundos).
 * @param {string} key Identificador del formulario (ej: 'presupuesto')
 * @param {number} minSeconds Mínimo de segundos requeridos (default 60)
 * @returns {{ allowed: boolean, remainingSeconds: number }}
 */
export function checkRateLimit(key = 'presupuesto', minSeconds = 60) {
  const storageKey = `rate_limit_${key}`
  const lastTimeStr = localStorage.getItem(storageKey)
  if (!lastTimeStr) {
    return { allowed: true, remainingSeconds: 0 }
  }

  const lastTime = parseInt(lastTimeStr, 10)
  const now = Date.now()
  const diffSeconds = Math.floor((now - lastTime) / 1000)

  if (diffSeconds < minSeconds) {
    return {
      allowed: false,
      remainingSeconds: minSeconds - diffSeconds,
    }
  }

  return { allowed: true, remainingSeconds: 0 }
}

/**
 * Registra el timestamp del envío para el rate limiting.
 * @param {string} key 
 */
export function recordSubmitTimestamp(key = 'presupuesto') {
  const storageKey = `rate_limit_${key}`
  localStorage.setItem(storageKey, Date.now().toString())
}
