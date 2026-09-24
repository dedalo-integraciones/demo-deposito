import { useState, useEffect, useMemo, useCallback } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  Users,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  UserCheck,
  UserX,
  X,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getUsuarios,
  checkEmailExists,
  crearUsuarioSecundario,
  toggleUsuarioStatus,
} from '../services/usuariosService.js'
import MustChangePasswordModal from '../components/admin/MustChangePasswordModal.jsx'

export default function UsuariosPage() {
  const { user, isSuperAdmin, loading: authLoading, mustChangePasswordRequired } = useAuth()

  // Lista de usuarios
  const [usuariosList, setUsuariosList] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Formulario de alta
  const [emailInput, setEmailInput] = useState('')
  const [selectedRole, setSelectedRole] = useState('admin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailCheckStatus, setEmailCheckStatus] = useState({ state: 'idle', message: '' }) // idle, valid, invalid, exists

  // Modal de confirmación tras alta
  const [createdUserModal, setCreatedUserModal] = useState(null) // { email, tempPassword, rol }
  const [copied, setCopied] = useState(false)

  // Cargar lista de usuarios
  const loadUsersList = useCallback(async () => {
    setLoadingList(true)
    try {
      const data = await getUsuarios()
      setUsuariosList(data)
    } catch (err) {
      console.error('[UsuariosPage] Error al cargar lista de usuarios:', err)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsersList()
    }
  }, [isSuperAdmin, loadUsersList])

  // Validación en vivo del campo email
  useEffect(() => {
    const clean = emailInput.trim().toLowerCase()
    if (!clean) {
      setEmailCheckStatus({ state: 'idle', message: '' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clean)) {
      setEmailCheckStatus({ state: 'invalid', message: 'Email inválido' })
      return
    }

    // Verificar en lista local o Firestore si el email ya existe
    const existsLocally = usuariosList.some((u) => u.email?.toLowerCase() === clean)
    if (existsLocally) {
      setEmailCheckStatus({ state: 'exists', message: 'Este usuario ya existe' })
      return
    }

    // Chequeo asíncrono con debounce
    const timer = setTimeout(async () => {
      const existsInDb = await checkEmailExists(clean)
      if (existsInDb) {
        setEmailCheckStatus({ state: 'exists', message: 'Este usuario ya existe' })
      } else {
        setEmailCheckStatus({ state: 'valid', message: 'Email válido' })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [emailInput, usuariosList])

  // Redirección si no es SuperAdmin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          <p className="text-sm font-medium text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  // Manejar submit de alta
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (emailCheckStatus.state !== 'valid' || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await crearUsuarioSecundario({
        email: emailInput,
        rol: selectedRole,
      })

      // Abrir modal de éxito con contraseña temporal
      setCreatedUserModal({
        email: result.email,
        tempPassword: result.tempPassword,
        rol: selectedRole,
      })

      // Limpiar formulario
      setEmailInput('')
      setSelectedRole('admin')
      setEmailCheckStatus({ state: 'idle', message: '' })

      // Recargar lista
      await loadUsersList()
    } catch (err) {
      console.error('[UsuariosPage] Error al crear usuario:', err)
      alert(err?.message || 'Error al crear el usuario.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Manejar cambio de estado (activo/deshabilitado)
  const handleToggleStatus = async (userDoc) => {
    const currentStatus = userDoc.status || 'activo'
    const newStatusTarget = currentStatus === 'deshabilitado' ? 'activo' : 'deshabilitado'

    const confirmMsg = `¿Estás seguro de que querés ${
      newStatusTarget === 'deshabilitado' ? 'deshabilitar' : 'habilitar'
    } al usuario ${userDoc.email}?`

    if (!window.confirm(confirmMsg)) return

    setActionLoadingId(userDoc.id)
    try {
      await toggleUsuarioStatus(userDoc.id, currentStatus)
      await loadUsersList()
    } catch (err) {
      console.error('[UsuariosPage] Error al cambiar estado:', err)
      alert('Error al actualizar el estado del usuario.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Copiar contraseña al portapapeles
  const handleCopyPassword = () => {
    if (!createdUserModal?.tempPassword) return
    navigator.clipboard.writeText(createdUserModal.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generar link de WhatsApp
  const getWhatsAppShareUrl = () => {
    if (!createdUserModal) return '#'
    const baseUrl = window.location.origin + '/admin/login'
    const text = `Tu usuario para Depósito Bombal es ${createdUserModal.email}. Contraseña temporal: ${createdUserModal.tempPassword}. Entrá en ${baseUrl} y cambiala en tu primer ingreso.`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modal bloqueante si el superadmin requiere cambio de contraseña en primer ingreso */}
      {mustChangePasswordRequired && <MustChangePasswordModal />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                id="usuarios-btn-volver-admin"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                title="Volver al panel de administración"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Panel Admin</span>
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[var(--primary)] font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900 leading-none">
                    Gestión de Usuarios
                  </h1>
                  <span className="text-xs text-gray-500">Módulo de Superadmin</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>SADMIN: {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Formulario de Alta (Arriba, diseño minimalista) */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <UserPlus className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-gray-900">Dar de Alta Nuevo Usuario</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Campo Email único */}
              <div className="md:col-span-7 space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Email del Usuario <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="usuarios-input-email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ejemplo@depositobombal.com"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none transition-all ${
                      emailCheckStatus.state === 'valid'
                        ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                        : emailCheckStatus.state === 'invalid' || emailCheckStatus.state === 'exists'
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent'
                    }`}
                  />
                  {emailCheckStatus.state === 'valid' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute right-3 top-2.5" />
                  )}
                  {(emailCheckStatus.state === 'invalid' || emailCheckStatus.state === 'exists') && (
                    <XCircle className="w-5 h-5 text-red-500 absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Mensaje de validación en vivo */}
                {emailCheckStatus.message && (
                  <p
                    className={`text-xs font-medium flex items-center gap-1 ${
                      emailCheckStatus.state === 'valid'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {emailCheckStatus.state === 'valid' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{emailCheckStatus.message}</span>
                  </p>
                )}
              </div>

              {/* Selector de Rol */}
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Rol de Acceso <span className="text-red-500">*</span>
                </label>
                <select
                  id="usuarios-select-rol"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none bg-white cursor-pointer"
                >
                  <option value="admin">Admin (ADMIN)</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="superadmin">Superadmin (SADMIN)</option>
                </select>
              </div>

              {/* Botón de Submit */}
              <div className="md:col-span-2 pt-5">
                <button
                  type="submit"
                  id="usuarios-btn-dar-de-alta"
                  disabled={emailCheckStatus.state !== 'valid' || isSubmitting}
                  className="w-full py-2.5 px-4 bg-[var(--primary)] hover:opacity-95 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <span>Dar de alta</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Tabla de Usuarios Registrados */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Usuarios Registrados</h2>
              <p className="text-xs text-gray-500">
                Lista de usuarios y estado de acceso al sistema.
              </p>
            </div>
            <button
              type="button"
              onClick={loadUsersList}
              disabled={loadingList}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {loadingList ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
              <span className="text-sm">Cargando usuarios...</span>
            </div>
          ) : usuariosList.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No hay usuarios registrados aún en la base de datos.
            </div>
          ) : (
            <>
              {/* Vista Desktop (Tabla) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-6">Email</th>
                      <th className="py-3.5 px-6">Rol</th>
                      <th className="py-3.5 px-6">Estado</th>
                      <th className="py-3.5 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {usuariosList.map((u) => {
                      const isDeshabilitado = u.status === 'deshabilitado'
                      const isCurrentUser = u.email?.toLowerCase() === user.email?.toLowerCase()

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-6 font-medium text-gray-900 flex items-center gap-2">
                            <span>{u.email}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                Vos
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                              {u.rol || 'admin'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {isDeshabilitado ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deshabilitado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activo</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isCurrentUser ? (
                              <span className="text-xs text-gray-400 italic">No modificable</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                disabled={actionLoadingId === u.id}
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isDeshabilitado
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                {actionLoadingId === u.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isDeshabilitado ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Habilitar</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Deshabilitar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile (Tarjetas Apiladas) */}
              <div className="block md:hidden divide-y divide-gray-100">
                {usuariosList.map((u) => {
                  const isDeshabilitado = u.status === 'deshabilitado'
                  const isCurrentUser = u.email?.toLowerCase() === user.email?.toLowerCase()

                  return (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">{u.email}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                Vos
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 capitalize">
                            Rol: <strong className="text-gray-700">{u.rol || 'admin'}</strong>
                          </span>
                        </div>

                        <div>
                          {isDeshabilitado ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                              <UserX className="w-3 h-3" />
                              <span>Deshabilitado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                              <UserCheck className="w-3 h-3" />
                              <span>Activo</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end border-t border-gray-50">
                        {isCurrentUser ? (
                          <span className="text-xs text-gray-400 italic">No modificable</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoadingId === u.id}
                            className={`w-full py-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isDeshabilitado
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-red-50 border-red-300 text-red-700'
                            }`}
                          >
                            {actionLoadingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isDeshabilitado ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Habilitar usuario</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deshabilitar usuario</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Modal de Confirmación de Alta de Usuario (con contraseña temporal) */}
      {createdUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setCreatedUserModal(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Invitación enviada a {createdUserModal.email}
            </h3>

            <p className="text-sm text-gray-600 mb-6">
              Se envió el enlace para definir la contraseña. Si no llega, podés compartir estas credenciales temporales:
            </p>

            {/* Cinto / Box de Contraseña Temporal */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 mb-6">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Contraseña Temporal Generada:
              </span>
              <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 border border-gray-300 rounded-lg font-mono text-base font-bold text-gray-900">
                <span>{createdUserModal.tempPassword}</span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setCreatedUserModal(null)}
                className="w-full sm:w-auto py-2.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
