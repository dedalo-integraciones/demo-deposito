import { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Star,
  Flame,
  Search,
  Check,
  X,
  RefreshCw,
  Filter,
  RotateCcw,
} from 'lucide-react'
import {
  getAllProductos,
  createProducto,
  updateProducto,
  deleteProductoLogico,
} from '../../services/productosService.js'
import { getAllCategorias } from '../../services/categoriasService.js'
import { getAllRubros } from '../../services/rubrosService.js'
import { invalidarCatalogoCache } from '../../services/catalogoService.js'
import { getImageUrl } from '../../utils/cloudinary.js'
import { registrarPublicIdHuerfano } from '../../services/borradosPendientesService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ImageUploader from './ImageUploader.jsx'
import ModalConfirmacionDesactivacion from './ModalConfirmacionDesactivacion.jsx'

export default function ProductosAdmin() {
  const { user, userProfile, profile, loading: authLoading, mustChangePasswordRequired } = useAuth()
  const activeProfile = userProfile || profile
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [rubros, setRubros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroRubro, setFiltroRubro] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos, activos, inactivos, destacados, populares

  // Modal de Alta / Edición
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState(null)
  const [modalRubroSeleccionado, setModalRubroSeleccionado] = useState('')
  const [formData, setFormData] = useState({
    codigoOrigen: '',
    descripcion: '',
    idCategoria: '',
    obsUnidad: '',
    observaciones: '',
    destacado: false,
    popular: false,
    activo: true,
    imagenUrl: '',
    cloudinaryPublicId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Modal de Doble Confirmación de Desactivación (Soft Delete)
  const [productoADesactivar, setProductoADesactivar] = useState(null)
  const [isDesactivando, setIsDesactivando] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [prodsData, catsData, rubrosData] = await Promise.all([
        getAllProductos(),
        getAllCategorias(),
        getAllRubros(),
      ])
      setProductos(prodsData)
      setCategorias(catsData)
      setRubros(rubrosData)
    } catch (err) {
      console.error('[ProductosAdmin] Error al cargar datos:', err)
      const technicalMsg = err?.message
        ? `${err.message}${err.code ? ` (código: ${err.code})` : ''}`
        : String(err)
      setError(`Error técnico al cargar productos: ${technicalMsg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Si la autenticación aún está cargando o el usuario debe cambiar su contraseña temporal, no consultar antes de tiempo
    if (authLoading || mustChangePasswordRequired || !user) {
      return
    }
    fetchData()
  }, [user?.uid, activeProfile?.uid, activeProfile?.mustChangePassword, authLoading, mustChangePasswordRequired])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  // Mapas de referencia rápida
  const rubrosMap = rubros.reduce((acc, r) => {
    acc[r.id] = r.descripcion
    return acc
  }, {})

  const categoriasMap = categorias.reduce((acc, c) => {
    acc[c.id] = c
    return acc
  }, {})

  // Categorías filtradas en el modal según el rubro elegido
  const modalCategoriasDisponibles = modalRubroSeleccionado
    ? categorias.filter((c) => c.idRubro === modalRubroSeleccionado)
    : categorias

  // Categorías disponibles en el filtro de la tabla
  const filtroCategoriasDisponibles = filtroRubro
    ? categorias.filter((c) => c.idRubro === filtroRubro)
    : categorias

  const handleOpenCreate = () => {
    setEditingProducto(null)
    const primerRubro = rubros.length > 0 ? rubros[0].id : ''
    setModalRubroSeleccionado(primerRubro)
    const primerCat = categorias.find((c) => c.idRubro === primerRubro)

    setFormData({
      codigoOrigen: '',
      descripcion: '',
      idCategoria: primerCat ? primerCat.id : '',
      obsUnidad: '',
      observaciones: '',
      destacado: false,
      popular: false,
      activo: true,
      imagenUrl: '',
      cloudinaryPublicId: '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (prod) => {
    setEditingProducto(prod)
    const cat = categoriasMap[prod.idCategoria]
    const rubroId = cat ? cat.idRubro : ''
    setModalRubroSeleccionado(rubroId)

    setFormData({
      codigoOrigen: prod.codigoOrigen || '',
      descripcion: prod.descripcion || '',
      idCategoria: prod.idCategoria || '',
      obsUnidad: prod.obsUnidad || prod.unidad || '',
      observaciones: prod.observaciones || '',
      destacado: Boolean(prod.destacado),
      popular: Boolean(prod.popular),
      activo: prod.activo !== undefined ? prod.activo : true,
      imagenUrl: prod.imagenUrl || prod.imagen || '',
      cloudinaryPublicId: prod.cloudinaryPublicId || prod.public_id || '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleModalRubroChange = (rubroId) => {
    setModalRubroSeleccionado(rubroId)
    // Si la categoría actual no pertenece al nuevo rubro, seleccionar la primera disponible
    const disponibles = categorias.filter((c) => c.idRubro === rubroId)
    if (disponibles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        idCategoria: disponibles[0].id,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        idCategoria: '',
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.descripcion.trim()) {
      setFormError('La descripción del producto es obligatoria.')
      return
    }
    if (!formData.idCategoria) {
      setFormError('Debés seleccionar una categoría para el producto.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProducto) {
        await updateProducto(editingProducto.id, formData, user?.uid)
        showSuccess(`Producto "${formData.descripcion}" actualizado con éxito.`)
      } else {
        await createProducto(formData, user?.uid)
        showSuccess(`Producto "${formData.descripcion}" creado con éxito.`)
      }
      invalidarCatalogoCache()
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      console.error('[ProductosAdmin] Error al guardar producto:', err)
      setFormError('Ocurrió un error al guardar el producto. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDesactivar = (prod) => {
    setProductoADesactivar(prod)
  }

  const handleConfirmarDesactivacion = async () => {
    if (!productoADesactivar) return
    setIsDesactivando(true)
    try {
      const publicId = (productoADesactivar.cloudinaryPublicId || productoADesactivar.public_id || '').trim()
      if (publicId) {
        await registrarPublicIdHuerfano(publicId, 'productos')
        await updateProducto(
          productoADesactivar.id,
          {
            activo: false,
            imagenUrl: '',
            imagen: '',
            cloudinaryPublicId: '',
          },
          user?.uid
        )
      } else {
        await deleteProductoLogico(productoADesactivar.id, user?.uid)
      }
      invalidarCatalogoCache()
      showSuccess(`Producto "${productoADesactivar.descripcion}" desactivado correctamente.`)
      setProductoADesactivar(null)
      fetchData()
    } catch (err) {
      console.error('[ProductosAdmin] Error al desactivar producto:', err)
      setError('Error al desactivar el producto.')
    } finally {
      setIsDesactivando(false)
    }
  }

  const handleReactivar = async (prod) => {
    try {
      await updateProducto(prod.id, { activo: true }, user?.uid)
      invalidarCatalogoCache()
      showSuccess(`Producto "${prod.descripcion}" reactivado con éxito.`)
      fetchData()
    } catch (err) {
      console.error('[ProductosAdmin] Error al reactivar producto:', err)
      setError('Error al reactivar el producto.')
    }
  }

  // Filtrado de productos en cliente
  const productosFiltrados = productos.filter((prod) => {
    // Filtro por término de búsqueda (descripción o código interno de origen)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const descMatch = (prod.descripcion || '').toLowerCase().includes(term)
      const codMatch = (prod.codigoOrigen || '').toLowerCase().includes(term)
      if (!descMatch && !codMatch) return false
    }

    // Filtro por Rubro
    if (filtroRubro) {
      const cat = categoriasMap[prod.idCategoria]
      if (!cat || cat.idRubro !== filtroRubro) return false
    }

    // Filtro por Categoría
    if (filtroCategoria && prod.idCategoria !== filtroCategoria) {
      return false
    }

    // Filtro por Estado
    if (filtroEstado === 'activos' && !prod.activo) return false
    if (filtroEstado === 'inactivos' && prod.activo) return false
    if (filtroEstado === 'destacados' && !prod.destacado) return false
    if (filtroEstado === 'populares' && !prod.popular) return false

    return true
  })

  return (
    <div className="space-y-6">
      {/* Barra superior de acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--primary)]" />
            Gestión de Productos
          </h3>
          <p className="text-xs text-gray-500">
            Artículos del catálogo general ({productos.length} productos registrados)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
            id="admin-btn-nuevo-producto"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descripción o código..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Filtro Rubro */}
          <div>
            <select
              value={filtroRubro}
              onChange={(e) => {
                setFiltroRubro(e.target.value)
                setFiltroCategoria('')
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
            >
              <option value="">Todos los Rubros</option>
              {rubros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Categoría */}
          <div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
            >
              <option value="">Todas las Categorías</option>
              {filtroCategoriasDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activos">Solo Activos</option>
              <option value="inactivos">Solo Inactivos</option>
              <option value="destacados">Solo Destacados ⭐</option>
              <option value="populares">Solo Populares 🔥</option>
            </select>
          </div>
        </div>

        {(searchTerm || filtroRubro || filtroCategoria || filtroEstado !== 'todos') && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Mostrando {productosFiltrados.length} de {productos.length} productos
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setFiltroRubro('')
                setFiltroCategoria('')
                setFiltroEstado('todos')
              }}
              className="text-[var(--primary)] hover:underline cursor-pointer font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Alertas de feedback */}
      {successMessage && (
        <div
          id="alert-success-productos"
          className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          id="alert-error-productos"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Productos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            <p className="text-sm font-medium text-gray-600">Cargando productos...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No se encontraron productos</p>
            <p className="text-xs text-gray-500 mt-1">
              Probá ajustando los filtros o agregá un nuevo producto
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-14">
                    Imagen
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Descripción
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Rubro / Categoría
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Cód. Origen
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Unidad / Obs
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Insignias
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center w-28">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right w-28">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productosFiltrados.map((prod) => {
                  const img = prod.imagenUrl || prod.imagen
                  const cat = categoriasMap[prod.idCategoria]
                  const rubroNombre = cat ? rubrosMap[cat.idRubro] || '—' : '—'
                  const catNombre = cat ? cat.descripcion : '—'

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                          {img ? (
                            <img
                              src={getImageUrl(img, 400)}
                              alt={prod.descripcion}
                              className="max-w-full max-h-full w-auto h-auto object-contain mx-auto"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'https://placehold.co/100x100?text=Prod'
                              }}
                            />
                          ) : (
                            <Package className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900 max-w-xs">
                        <p className="line-clamp-2">{prod.descripcion}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-gray-800">{catNombre}</p>
                        <p className="text-[11px] text-gray-500">{rubroNombre}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-sm">
                          {prod.codigoOrigen || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {prod.obsUnidad || prod.unidad || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {prod.destacado && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                              title="Producto destacado"
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Destacado
                            </span>
                          )}
                          {prod.popular && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200"
                              title="Producto popular"
                            >
                              <Flame className="w-2.5 h-2.5 fill-orange-500 text-orange-500" />
                              Popular
                            </span>
                          )}
                          {!prod.destacado && !prod.popular && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            prod.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.activo ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {prod.activo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar producto"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDesactivar(prod)}
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
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1.5 text-gray-600 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar producto"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReactivar(prod)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Reactivar producto en el catálogo"
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
        isOpen={Boolean(productoADesactivar)}
        onClose={() => setProductoADesactivar(null)}
        onConfirm={handleConfirmarDesactivacion}
        tipo="producto"
        nombreElemento={productoADesactivar?.descripcion || ''}
        isProcessing={isDesactivando}
      />

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div
          id="modal-producto-form"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
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
              {/* Selectores de Rubro y Categoría dependiente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-prod-rubro"
                    className="block text-xs font-semibold text-gray-700 mb-1"
                  >
                    Rubro <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="modal-prod-rubro"
                    value={modalRubroSeleccionado}
                    onChange={(e) => handleModalRubroChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
                  >
                    <option value="" disabled>
                      Seleccioná un rubro
                    </option>
                    {rubros.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="modal-prod-categoria"
                    className="block text-xs font-semibold text-gray-700 mb-1"
                  >
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="modal-prod-categoria"
                    required
                    value={formData.idCategoria}
                    onChange={(e) =>
                      setFormData({ ...formData, idCategoria: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] bg-white"
                  >
                    <option value="" disabled>
                      {modalCategoriasDisponibles.length === 0
                        ? 'Sin categorías para este rubro'
                        : 'Seleccioná una categoría'}
                    </option>
                    {modalCategoriasDisponibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label
                  htmlFor="modal-prod-descripcion"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Descripción del Producto <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-prod-descripcion"
                  type="text"
                  required
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Ej: Cable unipolar 2.5 mm² Normalizado (Rollo 100m)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Unidad/Obs */}
              <div>
                <label
                  htmlFor="modal-prod-unidad"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Unidad de Medida / Presentación
                </label>
                <input
                  id="modal-prod-unidad"
                  type="text"
                  value={formData.obsUnidad}
                  onChange={(e) =>
                    setFormData({ ...formData, obsUnidad: e.target.value })
                  }
                  placeholder="Ej: Rollo x 100m, Bulto x 12u, Unidad"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Observaciones adicionales */}
              <div>
                <label
                  htmlFor="modal-prod-observaciones"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Observaciones Técnicas (opcional)
                </label>
                <textarea
                  id="modal-prod-observaciones"
                  rows={2}
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  placeholder="Detalles de especificación, marca, normas, etc."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>

              {/* Componente de Imagen */}
              <ImageUploader
                value={formData.imagenUrl}
                publicId={formData.cloudinaryPublicId}
                origen="productos"
                onChange={(url, newPublicId) =>
                  setFormData((prev) => ({
                    ...prev,
                    imagenUrl: url,
                    cloudinaryPublicId: newPublicId || '',
                  }))
                }
                onUpdateDocument={
                  editingProducto?.id
                    ? async ({ imagenUrl, cloudinaryPublicId }) => {
                        await updateProducto(
                          editingProducto.id,
                          {
                            imagenUrl,
                            imagen: imagenUrl,
                            cloudinaryPublicId,
                          },
                          user?.uid
                        )
                        invalidarCatalogoCache()
                        fetchData()
                      }
                    : null
                }
                label="Imagen del Producto"
              />

              {/* Checkboxes de flags */}
              <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300"
                  />
                  <span className="text-xs font-medium text-gray-700">Activo</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.destacado}
                    onChange={(e) =>
                      setFormData({ ...formData, destacado: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-gray-300"
                  />
                  <span className="text-xs font-medium text-gray-700">Destacado ⭐</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) =>
                      setFormData({ ...formData, popular: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="text-xs font-medium text-gray-700">Popular 🔥</span>
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
                    <span>{editingProducto ? 'Guardar Cambios' : 'Crear Producto'}</span>
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
