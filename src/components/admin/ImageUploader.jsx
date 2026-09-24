import { useState, useRef, useEffect } from 'react'
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react'
import { getImageUrl } from '../../utils/cloudinary.js'
import { registrarPublicIdHuerfano } from '../../services/borradosPendientesService.js'

// Extensiones y MIME types admitidos exactamente según especificación
const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'pjpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
  'ico',
  'heic',
  'heif',
  'avif',
]

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/ico',
  'image/heic',
  'image/heif',
  'image/avif',
]

const ACCEPT_STRING = '.jpg,.jpeg,.jpe,.jfif,.pjpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.ico,.heic,.heif,.avif'

// Función para aplicar transformaciones de optimización en Cloudinary
function applyCloudinaryTransformation(url) {
  if (!url) return url
  if (url.includes('/image/upload/') && !url.includes('/f_auto,q_auto,w_800,c_limit/')) {
    return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800,c_limit/')
  }
  return url
}

// Lee las dimensiones nativas de un archivo antes de subirlo
const readFileDimensions = (file) => {
  return new Promise((resolve) => {
    try {
      const objUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const dims = { width: img.naturalWidth, height: img.naturalHeight }
        URL.revokeObjectURL(objUrl)
        resolve(dims)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objUrl)
        resolve(null)
      }
      img.src = objUrl
    } catch {
      resolve(null)
    }
  })
}

export default function ImageUploader({
  value,
  publicId = '',
  onChange,
  onUpdateDocument,
  origen = 'admin_uploader',
  label = 'Imagen',
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [resolutionWarning, setResolutionWarning] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [useUrlInput, setUseUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState(value || '')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Sincronizar urlInput si el valor exterior cambia
  useEffect(() => {
    setUrlInput(value || '')
  }, [value])

  const handleFileChange = async (file) => {
    if (!file) return
    setError('')
    setResolutionWarning('')

    const fileName = file.name ? file.name.toLowerCase() : ''
    const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
    const mime = file.type ? file.type.toLowerCase() : ''

    // 1. Prohibición estricta de SVG (riesgo de XSS)
    if (ext === 'svg' || mime.includes('svg')) {
      setError('Formato no soportado. Usá JPG, PNG, WebP, GIF, BMP, TIFF, ICO, HEIC o AVIF.')
      return
    }

    // 2. Validación interna (extensión o MIME permitidos)
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext)
    const isValidMime = ALLOWED_MIME_TYPES.includes(mime)

    if (!isValidExt && !isValidMime) {
      setError('Formato no soportado. Usá JPG, PNG, WebP, GIF, BMP, TIFF, ICO, HEIC o AVIF.')
      return
    }

    // 3. Leer dimensiones reales ANTES de subir
    const dims = await readFileDimensions(file)
    if (dims) {
      setDimensions(`${dims.width}×${dims.height} px`)
      // Si el lado menor es < 800 px, mostrar advertencia amarilla y permitir continuar igual
      if (Math.min(dims.width, dims.height) < 800) {
        setResolutionWarning('Resolución baja: se verá pixelada en el catálogo')
      } else {
        setResolutionWarning('')
      }
    } else {
      setDimensions('')
      setResolutionWarning('')
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const cloudName =
        import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME ||
        (typeof process !== 'undefined' ? process.env.VITE_CLOUDINARY_CLOUD_NAME : '') ||
        'ndaarqff'

      const uploadPreset =
        import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
        (typeof window !== 'undefined' ? localStorage.getItem('CLOUDINARY_UPLOAD_PRESET') : '') ||
        'deposito-bombal'

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      // Regla 2: Todo upload se hace como asset nuevo: NO pasar public_id nunca (ni en altas ni en reemplazos)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percent)
        }
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            const rawUrl = response.secure_url || response.url
            if (!rawUrl) {
              throw new Error('No se recibió la URL de la imagen')
            }

            const newPublicId = response.public_id || ''
            const oldPublicId = (publicId || '').trim()

            // Regla 3: Al REEMPLAZAR, registrar el public_id ANTERIOR con origen 'reemplazo'
            if (oldPublicId && oldPublicId !== newPublicId) {
              await registrarPublicIdHuerfano(oldPublicId, 'reemplazo')
            }

            const transformedUrl = applyCloudinaryTransformation(rawUrl)

            // Actualizar documento inmediatamente si está en modo edición directa
            if (onUpdateDocument) {
              try {
                await onUpdateDocument({
                  imagenUrl: transformedUrl,
                  cloudinaryPublicId: newPublicId,
                })
              } catch (updateErr) {
                console.warn('[ImageUploader] Error actualizando documento tras upload:', updateErr)
              }
            }

            onChange(transformedUrl, newPublicId)
            setUrlInput(transformedUrl)
            setError('')
          } catch (e) {
            console.error('[Cloudinary] Error procesando respuesta:', e)
            setError('Error procesando la respuesta de la imagen. Podés reintentar.')
          }
        } else {
          let msg = 'Error al subir la imagen a Cloudinary.'
          try {
            const resErr = JSON.parse(xhr.responseText)
            if (resErr.error?.message) {
              if (resErr.error.message.includes('Upload preset must be whitelisted')) {
                msg = `El preset de carga '${uploadPreset}' requiere ser de tipo 'Unsigned' en Cloudinary.`
              } else {
                msg = `Error de Cloudinary: ${resErr.error.message}`
              }
            }
          } catch (e) {}
          console.error('[Cloudinary] Error en respuesta HTTP:', xhr.status, xhr.responseText)
          setError(msg)
        }
        setIsUploading(false)
      }

      xhr.onerror = () => {
        console.error('[Cloudinary] Error de red')
        setError('Error de conexión al subir la imagen. Por favor reintentá.')
        setIsUploading(false)
      }

      xhr.send(formData)
    } catch (err) {
      console.error('[ImageUploader] Error al preparar la subida:', err)
      setError('Ocurrió un error al procesar el archivo. Podés reintentar.')
      setIsUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // Regla 4: Al QUITAR una imagen sin reemplazo:
  // Registrar el public_id huérfano en cloudinary_borrados_pendientes y limpiar campos del documento
  const handleRemove = async () => {
    setIsRemoving(true)
    setError('')
    try {
      const trimmedPublicId = (publicId || '').trim()
      if (trimmedPublicId) {
        await registrarPublicIdHuerfano(trimmedPublicId, origen)
      }

      // Limpiar campos del documento si existe handler de actualización
      if (onUpdateDocument) {
        try {
          await onUpdateDocument({
            imagenUrl: '',
            cloudinaryPublicId: '',
          })
        } catch (updateErr) {
          console.warn('[ImageUploader] Error limpiando documento tras quitar imagen:', updateErr)
        }
      }

      onChange('', '')
      setUrlInput('')
      setDimensions('')
      setResolutionWarning('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('[ImageUploader] Error al quitar imagen:', err)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim()
    const trimmedPublicId = (publicId || '').trim()
    // Si tenía un publicId previo y se pasa a URL externa, registrarlo como huérfano
    if (trimmedPublicId) {
      registrarPublicIdHuerfano(trimmedPublicId, origen)
    }
    if (onUpdateDocument) {
      onUpdateDocument({
        imagenUrl: trimmed,
        cloudinaryPublicId: '',
      })
    }
    onChange(trimmed, '')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <button
          type="button"
          onClick={() => setUseUrlInput(!useUrlInput)}
          className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{useUrlInput ? 'Subir archivo' : 'Ingresar URL directa'}</span>
        </button>
      </div>

      {/* Texto de ayuda visible en la ventana de subida/edición */}
      <div className="text-[11px] text-gray-600 bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 leading-relaxed">
        <span className="font-semibold text-gray-700">Imagen recomendada:</span> cuadrada (1:1), mínimo 800×800 px,
        ideal 1600×1600 px. Formatos aceptados: JPG, PNG, WebP, GIF, BMP, TIFF, ICO, HEIC, AVIF. Las imágenes más
        grandes se optimizan automáticamente.
      </div>

      {/* Mensaje de error si el formato no es soportado u ocurre fallo */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Advertencia amarilla si la resolución es menor a 800 px */}
      {resolutionWarning && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="font-medium">{resolutionWarning}</span>
        </div>
      )}

      {/* Vista previa de la imagen seleccionada */}
      {value ? (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col items-center gap-3 max-w-full">
          {/* Contenedor de preview con tamaño fijo: max-height: 300px, max-width: 100% */}
          <div
            className="w-full h-56 sm:h-64 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-2"
            style={{ maxHeight: '300px', maxWidth: '100%' }}
          >
            <img
              src={getImageUrl(value, 800)}
              alt="Vista previa"
              className="max-h-full max-w-full h-auto w-auto object-contain mx-auto"
              style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                if (!dimensions && e.target.naturalWidth && e.target.naturalHeight) {
                  setDimensions(`${e.target.naturalWidth}×${e.target.naturalHeight} px`)
                }
              }}
              onError={(e) => {
                e.target.onerror = null
                e.target.src = 'https://placehold.co/300x200?text=Error+de+imagen'
              }}
            />
          </div>

          <div className="w-full flex items-center justify-between gap-3 pt-1 border-t border-gray-200/80">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium text-gray-800 truncate max-w-xs" title={value}>
                  {value.startsWith('data:') ? 'Imagen cargada localmente' : value}
                </p>
                {/* Dimensiones del archivo elegido junto al preview */}
                {dimensions && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-200/80 text-gray-800">
                    {dimensions}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Imagen vinculada correctamente (proporción original sin recorte)
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isRemoving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border border-red-200 shrink-0 disabled:opacity-50"
              title="Borrar imagen"
            >
              {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isRemoving ? 'Quitando...' : 'Quitar'}</span>
            </button>
          </div>
        </div>
      ) : useUrlInput ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-2 text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[var(--primary)] bg-red-50/50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
          }`}
        >
          {/* Atributo accept con la lista permitida */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
              <span className="text-xs font-medium text-gray-600">
                Subiendo imagen al servidor... ({uploadProgress}%)
              </span>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <UploadCloud className="w-6 h-6 text-gray-400" />
              <p className="text-xs font-medium text-gray-700">
                Arrastrá una imagen o <span className="text-[var(--primary)] underline">explorá</span>
              </p>
              <p className="text-[10px] text-gray-400">
                JPG, PNG, WebP, GIF, BMP, TIFF, ICO, HEIC, AVIF
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
