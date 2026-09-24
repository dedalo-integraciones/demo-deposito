import { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Check,
  X,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import {
  getAllRubros,
  createRubro,
  updateRubro,
  deleteRubroLogico,
} from '../../services/rubrosService.js'
import { invalidarCatalogoCache } from '../../services/catalogoService.js'
import { getImageUrl } from '../../utils/cloudinary.js'
import { registrarPublicIdHuerfano } from '../../services/borradosPendientesService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ImageUploader from './ImageUploader.jsx'
import ModalConfirmacionDesactivacion from './ModalConfirmacionDesactivacion.jsx'

export default function RubrosAdmin() {
  const { user, userProfile, profile, loading: authLoading, mustChangePasswordRequired } = useAuth()
  const activeProfile = userProfile || profile
  const [rubros, setRubros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal de Alta / Edición
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRubro, setEditingRubro] = useState(null)
  const [formData, setFormData] = useState({
    descripcion: '',
    imagenUrl: '',
    cloudinaryPublicId: '',
    activo: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Modal de Doble Confirmación de Desactivación (Soft Delete)
  const [rubroADesactivar, setRubroADesactivar] = useState(null)
  const [isDesactivando, setIsDesactivando] = useState(false)

  const fetchRubros = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAllRubros()
      setRubros(data)
    } catch (err) {
      console.error('[RubrosAdmin] Error al cargar rubros:', err)
      const technicalMsg = err?.message
        ? `${err.message}${err.code ? ` (código: ${err.code})` : ''}`
        : String(err)
      setError(`Error técnico al cargar rubros: ${technicalMsg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || mustChangePasswordRequired || !user) {
      return
    }
    fetchRubros()
  }, [user?.uid, activeProfile?.uid, activeProfile?.mustChangePassword, authLoading, mustChangePasswordRequired])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  const handleOpenCreate = () => {
    setEditingRubro(null)
    setFormData({
      descripcion: '',
      imagenUrl: '',
      cloudinaryPublicId: '',
      activo: true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (rubro) => {
    setEditingRubro(rubro)
    setFormData({
      descripcion: rubro.descripcion || '',
      imagenUrl: rubro.imagenUrl || rubro.imagen || '',
      cloudinaryPublicId: rubro.cloudinaryPublicId || rubro.public_id || '',
      activo: rubro.activo !== undefined ? rubro.activo : true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.descripcion.trim()) {
      setFormError('La descripción del rubro es obligatoria.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingRubro) {
        await updateRubro(editingRubro.id, formData)
        showSuccess(`Rubro "${formData.descripcion}" actualizado con éxito.`)
      } else {
        await createRubro(formData)
        showSuccess(`Rubro "${formData.descripcion}" creado con éxito.`)
      }
      invalidarCatalogoCache()
      setIsModalOpen(false)
      fetchRubros()
    } catch (err) {
      console.error('[RubrosAdmin] Error al guardar rubro:', err)
      setFormError('Ocurrió un error al guardar el rubro. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDesactivar = (rubro) => {
    setRubroADesactivar(rubro)
  }

  const handleConfirmarDesactivacion = async () => {
    if (!rubroADesactivar) return
    setIsDesactivando(true)
    try {
      const publicId = (rubroADesactivar.cloudinaryPublicId || rubroADesactivar.public_id || '').trim()
      if (publicId) {
        await registrarPublicIdHuerfano(publicId, 'rubros')
        await updateRubro(rubroADesactivar.id, {
          activo: false,
          imagenUrl: '',
          imagen: '',
          cloudinaryPublicId: '',
        })
      } else {
        await deleteRubroLogico(rubroADesactivar.id)
      }
      invalidarCatalogoCache()
      showSuccess(`Rubro "${rubroADesactivar.descripcion}" desactivado correctamente.`)
      setRubroADesactivar(null)
      fetchRubros()
    } catch (err) {
      console.error('[RubrosAdmin] Error al desactivar rubro:', err)
      setError('Error al desactivar el rubro.')
    } finally {
      setIsDesactivando(false)
    }
  }

  const handleReactivar = async (rubro) => {
    try {
      await updateRubro(rubro.id, { activo: true })
      invalidarCatalogoCache()
      showSuccess(`Rubro "${rubro.descripcion}" reactivado con éxito.`)
      fetchRubros()
    } catch (err) {
      console.error('[RubrosAdmin] Error al reactivar rubro:', err)
      setError('Error al reactivar el rubro.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra superior de acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            Gestión de Rubros
          </h3>
          <p className="text-xs text-gray-500">
            Familias principales del catálogo ({rubros.length} registros totales)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchRubros}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            id="admin-btn-nuevo-rubro"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Rubro</span>
          </button>
        </div>
      </div>

      {/* Alertas de feedback */}
      {successMessage && (
        <div
          id="alert-success-rubros"
          className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          id="alert-error-rubros"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Rubros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            <p className="text-sm font-medium text-gray-600">Cargando rubros...</p>
          </div>
        ) : rubros.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No hay rubros registrados</p>
            <p className="text-xs text-gray-500 mt-1">Creá el primer rubro para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5 w-16">
                    Imagen
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center w-32">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right w-40">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rubros.map((rubro) => {
                  const img = rubro.imagenUrl || rubro.imagen
                  return (
                    <tr key={rubro.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                          {img ? (
                            <img
                              src={getImageUrl(img, 400)}
                              alt={rubro.descripcion}
                              className="max-w-full max-h-full w-auto h-auto object-contain mx-auto"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'https://placehold.co/100x100?text=Rubro'
                              }}
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{rubro.descripcion}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            rubro.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rubro.activo ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {rubro.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rubro.activo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rubro)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar rubro"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDesactivar(rubro)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Desactivar (eliminar lógico)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rubro)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar rubro"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReactivar(rubro)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Reactivar rubro en el catálogo"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reactivar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Doble Confirmación de Desactivación */}
      <ModalConfirmacionDesactivacion
        isOpen={Boolean(rubroADesactivar)}
        onClose={() => setRubroADesactivar(null)}
        onConfirm={handleConfirmarDesactivacion}
        tipo="rubro"
        nombreElemento={rubroADesactivar?.descripcion || ''}
        isProcessing={isDesactivando}
      />

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div
          id="modal-rubro-form"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                {editingRubro ? 'Editar Rubro' : 'Nuevo Rubro'}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="rubro-descripcion"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  id="rubro-descripcion"
                  type="text"
                  required
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Ej: Materiales Eléctricos, Pinturas, Ferretería..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Componente de Imagen */}
              <ImageUploader
                value={formData.imagenUrl}
                publicId={formData.cloudinaryPublicId}
                origen="rubros"
                onChange={(url, newPublicId) =>
                  setFormData((prev) => ({
                    ...prev,
                    imagenUrl: url,
                    cloudinaryPublicId: newPublicId || '',
                  }))
                }
                onUpdateDocument={
                  editingRubro?.id
                    ? async ({ imagenUrl, cloudinaryPublicId }) => {
                        await updateRubro(editingRubro.id, {
                          imagenUrl,
                          imagen: imagenUrl,
                          cloudinaryPublicId,
                        })
                        invalidarCatalogoCache()
                        fetchRubros()
                      }
                    : null
                }
                label="Imagen del Rubro"
              />

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Rubro activo (visible en el catálogo público)
                  </span>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingRubro ? 'Guardar Cambios' : 'Crear Rubro'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
