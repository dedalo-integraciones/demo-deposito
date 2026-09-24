import { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderTree,
  Check,
  X,
  RefreshCw,
  Filter,
  RotateCcw,
} from 'lucide-react'
import {
  getAllCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoriaLogico,
} from '../../services/categoriasService.js'
import { getAllRubros } from '../../services/rubrosService.js'
import { invalidarCatalogoCache } from '../../services/catalogoService.js'
import { getImageUrl } from '../../utils/cloudinary.js'
import { registrarPublicIdHuerfano } from '../../services/borradosPendientesService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ImageUploader from './ImageUploader.jsx'
import ModalConfirmacionDesactivacion from './ModalConfirmacionDesactivacion.jsx'

export default function CategoriasAdmin() {
  const { user, userProfile, profile, loading: authLoading, mustChangePasswordRequired } = useAuth()
  const activeProfile = userProfile || profile
  const [categorias, setCategorias] = useState([])
  const [rubros, setRubros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filtro por Rubro
  const [filtroRubro, setFiltroRubro] = useState('')

  // Modal de Alta / Edición
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [formData, setFormData] = useState({
    idRubro: '',
    descripcion: '',
    observaciones: '',
    imagenUrl: '',
    cloudinaryPublicId: '',
    activo: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Modal de Doble Confirmación de Desactivación (Soft Delete)
  const [categoriaADesactivar, setCategoriaADesactivar] = useState(null)
  const [isDesactivando, setIsDesactivando] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [catsData, rubrosData] = await Promise.all([
        getAllCategorias(),
        getAllRubros(),
      ])
      setCategorias(catsData)
      setRubros(rubrosData)
    } catch (err) {
      console.error('[CategoriasAdmin] Error al cargar datos:', err)
      const technicalMsg = err?.message
        ? `${err.message}${err.code ? ` (código: ${err.code})` : ''}`
        : String(err)
      setError(`Error técnico al cargar categorías o rubros: ${technicalMsg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || mustChangePasswordRequired || !user) {
      return
    }
    fetchData()
  }, [user?.uid, activeProfile?.uid, activeProfile?.mustChangePassword, authLoading, mustChangePasswordRequired])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  // Mapa rápido de idRubro a descripción
  const rubrosMap = rubros.reduce((acc, r) => {
    acc[r.id] = r.descripcion
    return acc
  }, {})

  const handleOpenCreate = () => {
    setEditingCategoria(null)
    setFormData({
      idRubro: rubros.length > 0 ? rubros[0].id : '',
      descripcion: '',
      observaciones: '',
      imagenUrl: '',
      cloudinaryPublicId: '',
      activo: true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cat) => {
    setEditingCategoria(cat)
    setFormData({
      idRubro: cat.idRubro || '',
      descripcion: cat.descripcion || '',
      observaciones: cat.observaciones || '',
      imagenUrl: cat.imagenUrl || cat.imagen || '',
      cloudinaryPublicId: cat.cloudinaryPublicId || cat.public_id || '',
      activo: cat.activo !== undefined ? cat.activo : true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.descripcion.trim()) {
      setFormError('La descripción de la categoría es obligatoria.')
      return
    }
    if (!formData.idRubro) {
      setFormError('Debés seleccionar un rubro al cual pertenezca la categoría.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingCategoria) {
        await updateCategoria(editingCategoria.id, formData)
        showSuccess(`Categoría "${formData.descripcion}" actualizada con éxito.`)
      } else {
        await createCategoria(formData)
        showSuccess(`Categoría "${formData.descripcion}" creada con éxito.`)
      }
      invalidarCatalogoCache()
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      console.error('[CategoriasAdmin] Error al guardar categoría:', err)
      setFormError('Ocurrió un error al guardar la categoría. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDesactivar = (cat) => {
    setCategoriaADesactivar(cat)
  }

  const handleConfirmarDesactivacion = async () => {
    if (!categoriaADesactivar) return
    setIsDesactivando(true)
    try {
      const publicId = (categoriaADesactivar.cloudinaryPublicId || categoriaADesactivar.public_id || '').trim()
      if (publicId) {
        await registrarPublicIdHuerfano(publicId, 'categorias')
        await updateCategoria(categoriaADesactivar.id, {
          activo: false,
          imagenUrl: '',
          imagen: '',
          cloudinaryPublicId: '',
        })
      } else {
        await deleteCategoriaLogico(categoriaADesactivar.id)
      }
      invalidarCatalogoCache()
      showSuccess(`Categoría "${categoriaADesactivar.descripcion}" desactivada correctamente.`)
      setCategoriaADesactivar(null)
      fetchData()
    } catch (err) {
      console.error('[CategoriasAdmin] Error al desactivar:', err)
      setError('Error al desactivar la categoría.')
    } finally {
      setIsDesactivando(false)
    }
  }

  const handleReactivar = async (cat) => {
    try {
      await updateCategoria(cat.id, { activo: true })
      invalidarCatalogoCache()
      showSuccess(`Categoría "${cat.descripcion}" reactivada con éxito.`)
      fetchData()
    } catch (err) {
      console.error('[CategoriasAdmin] Error al reactivar:', err)
      setError('Error al reactivar la categoría.')
    }
  }

  const categoriasFiltradas = filtroRubro
    ? categorias.filter((c) => c.idRubro === filtroRubro)
    : categorias

  return (
    <div className="space-y-6">
      {/* Barra superior de acciones y filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600" />
            Gestión de Categorías
          </h3>
          <p className="text-xs text-gray-500">
            Subdivisiones por familia ({categorias.length} registros totales)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Selector de filtro por Rubro */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gray-300 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={filtroRubro}
              onChange={(e) => setFiltroRubro(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="">Todos los Rubros</option>
              {rubros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.descripcion}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            id="admin-btn-nueva-categoria"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* Alertas de feedback */}
      {successMessage && (
        <div
          id="alert-success-categorias"
          className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          id="alert-error-categorias"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Categorías */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            <p className="text-sm font-medium text-gray-600">Cargando categorías...</p>
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No se encontraron categorías</p>
            <p className="text-xs text-gray-500 mt-1">
              {filtroRubro
                ? 'No hay categorías para el rubro seleccionado'
                : 'Creá la primera categoría para comenzar'}
            </p>
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
                  <th scope="col" className="px-6 py-3.5">
                    Rubro Asociado
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Observaciones
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
                {categoriasFiltradas.map((cat) => {
                  const img = cat.imagenUrl || cat.imagen
                  const rubroNombre = rubrosMap[cat.idRubro] || 'Sin rubro'
                  return (
                    <tr key={cat.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                          {img ? (
                            <img
                              src={getImageUrl(img, 400)}
                              alt={cat.descripcion}
                              className="max-w-full max-h-full w-auto h-auto object-contain mx-auto"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'https://placehold.co/100x100?text=Cat'
                              }}
                            />
                          ) : (
                            <FolderTree className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{cat.descripcion}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {rubroNombre}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500">
                          {cat.observaciones || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            cat.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cat.activo ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {cat.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cat.activo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(cat)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar categoría"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDesactivar(cat)}
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
                                onClick={() => handleOpenEdit(cat)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar categoría"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReactivar(cat)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Reactivar categoría en el catálogo"
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
        isOpen={Boolean(categoriaADesactivar)}
        onClose={() => setCategoriaADesactivar(null)}
        onConfirm={handleConfirmarDesactivacion}
        tipo="categoria"
        nombreElemento={categoriaADesactivar?.descripcion || ''}
        isProcessing={isDesactivando}
      />

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div
          id="modal-categoria-form"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
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
                  htmlFor="categoria-rubro"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Rubro Perteneciente <span className="text-red-500">*</span>
                </label>
                <select
                  id="categoria-rubro"
                  required
                  value={formData.idRubro}
                  onChange={(e) =>
                    setFormData({ ...formData, idRubro: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
                >
                  <option value="" disabled>
                    Seleccioná un rubro
                  </option>
                  {rubros.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.descripcion} {!r.activo ? '(Inactivo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="categoria-descripcion"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  id="categoria-descripcion"
                  type="text"
                  required
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Ej: Cables Unipolares, Llaves Térmicas..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="categoria-observaciones"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Observaciones (opcional)
                </label>
                <input
                  id="categoria-observaciones"
                  type="text"
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  placeholder="Ej: Normas IRAM, Línea domiciliaria e industrial"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Componente de Imagen */}
              <ImageUploader
                value={formData.imagenUrl}
                publicId={formData.cloudinaryPublicId}
                origen="categorias"
                onChange={(url, newPublicId) =>
                  setFormData((prev) => ({
                    ...prev,
                    imagenUrl: url,
                    cloudinaryPublicId: newPublicId || '',
                  }))
                }
                onUpdateDocument={
                  editingCategoria?.id
                    ? async ({ imagenUrl, cloudinaryPublicId }) => {
                        await updateCategoria(editingCategoria.id, {
                          imagenUrl,
                          imagen: imagenUrl,
                          cloudinaryPublicId,
                        })
                        invalidarCatalogoCache()
                        fetchData()
                      }
                    : null
                }
                label="Imagen de la Categoría"
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
                    Categoría activa (visible en el catálogo público)
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
                    <span>{editingCategoria ? 'Guardar Cambios' : 'Crear Categoría'}</span>
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
