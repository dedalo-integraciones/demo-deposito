/**
 * Helper para transformaciones automáticas de imágenes en Cloudinary.
 * Aplica:
 * - w_{width}: ancho máximo en píxeles
 * - q_auto: calidad automática según dispositivo y conexión
 * - f_auto: formato automático óptimo (WebP / AVIF si es soportado)
 *
 * @param {string} url URL original de la imagen
 * @param {number} width Ancho máximo deseado (default 800)
 * @returns {string} URL transformada
 */
export function getImageUrl(url, width = 800) {
  if (!url) return ''
  if (!url.includes('cloudinary.com')) return url

  // Si ya contiene parámetros de transformación previos tras /upload/, reemplazarlos limpiamente
  if (/\/upload\/(?:[a-z]_[^/]+|[^/]+,[^/]+)\//i.test(url)) {
    return url.replace(/\/upload\/(?:[a-z]_[^/]+|[^/]+,[^/]+)\//i, `/upload/w_${width},q_auto,f_auto/`)
  }

  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`)
}
