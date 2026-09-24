import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Lock,
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminLogin() {
  const { user, login, resetPassword, isFirebaseConfigured, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [inactivityNotice, setInactivityNotice] = useState(false)

  // Modal / Vista de recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState('')

  // Detección de cierre de sesión por inactividad
  useEffect(() => {
    const isFromInactivity =
      location.state?.inactivityNotice ||
      searchParams.get('inactividad') === '1' ||
      sessionStorage.getItem('admin_inactivity_logout') === 'true'

    if (isFromInactivity) {
      setInactivityNotice(true)
      sessionStorage.removeItem('admin_inactivity_logout')
    }
  }, [location, searchParams])

  if (user) {
    return <Navigate to="/admin" replace />
  }

  const getFriendlyErrorMessage = (error) => {
    const code = error?.code || ''
    const msg = error?.message || ''

    if (msg.includes('deshabilitada')) {
      return msg
    }

    switch (code) {
      case 'auth/invalid-email':
        return 'El correo electrónico no tiene un formato válido.'
      case 'auth/user-not-found':
        return 'No existe una cuenta registrada con este correo electrónico.'
      case 'auth/wrong-password':
        return 'La contraseña ingresada es incorrecta.'
      case 'auth/invalid-credential':
        return 'Correo electrónico o contraseña incorrectos.'
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Por favor, intentá nuevamente en unos minutos.'
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido inhabilitada. Contactá al administrador.'
      case 'auth/missing-password':
        return 'Por favor ingresá tu contraseña.'
      case 'auth/missing-email':
        return 'Por favor ingresá tu correo electrónico.'
      case 'auth/network-request-failed':
        return 'Error de conexión. Verificá tu acceso a internet.'
      default:
        return msg || 'No se pudo iniciar sesión. Verificá tus credenciales e intentá nuevamente.'
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Por favor completá todos los campos.')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess(false)

    if (!resetEmail.trim()) {
      setResetError('Por favor ingresá tu correo electrónico.')
      return
    }

    setIsResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/user-not-found') {
        setResetError('No existe una cuenta registrada con este correo electrónico.')
      } else if (code === 'auth/invalid-email') {
        setResetError('El correo electrónico no tiene un formato válido.')
      } else if (code === 'auth/too-many-requests') {
        setResetError('Demasiadas solicitudes. Por favor esperá unos minutos.')
      } else {
        setResetError('No se pudo enviar el correo de recuperación. Intentá nuevamente.')
      }
    } finally {
      setIsResetLoading(false)
    }
  }

  const openForgotPassword = () => {
    setResetEmail(email)
    setResetError('')
    setResetSuccess(false)
    setShowForgotModal(true)
  }

  const activeError = errorMessage || authError

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link
            to="/"
            id="link-volver-inicio"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al catálogo
          </Link>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-[var(--primary)] shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Panel de Administración
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Depósito Bombal — Acceso exclusivo para personal autorizado
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-xl sm:px-10">
          {inactivityNotice && (
            <div
              id="alert-inactividad-admin"
              className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-start gap-3 shadow-xs"
            >
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900">Sesión cerrada por inactividad</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Se detectaron <strong>15 minutos de inactividad</strong>. Por motivos de seguridad, la sesión se cerró automáticamente. Por favor, iniciá sesión nuevamente.
                </p>
              </div>
            </div>
          )}

          {!isFirebaseConfigured && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Firebase no configurado</p>
                <p className="text-xs text-amber-700 mt-1">
                  Se requiere configurar las variables de entorno en <code>.env</code> para habilitar la autenticación real.
                </p>
              </div>
            </div>
          )}

          {activeError && (
            <div
              id="alert-error-login"
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{activeError}</span>
            </div>
          )}

          <form id="form-admin-login" onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electrónico
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@depositobombal.com"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  id="btn-olvide-contrasena"
                  onClick={openForgotPassword}
                  className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 sm:text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                id="btn-submit-login"
                disabled={isLoading}
                className="btn-primary w-full shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {showForgotModal && (
        <div
          id="modal-recuperar-password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-[var(--primary)]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Recuperar contraseña
                </h3>
                <p className="text-xs text-gray-500">
                  Te enviaremos un enlace a tu correo para restablecerla
                </p>
              </div>
            </div>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div className="space-y-2.5">
                    <div>
                      <p className="font-bold text-emerald-950">Correo de recuperación enviado</p>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        Si el correo <strong>{resetEmail}</strong> corresponde a un usuario registrado, recibirás un enlace para restablecer tu contraseña.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1.5 shadow-2xs">
                      <p className="font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        Importante — Revisá tu casilla de SPAM:
                      </p>
                      <p className="leading-relaxed text-amber-900">
                        • Si no lo ves en tu bandeja de entrada en los próximos minutos, <strong>revisá la carpeta de Correo no deseado o Spam</strong>.
                      </p>
                      <p className="leading-relaxed text-amber-900">
                        • El correo es emitido por un remitente oficial con el formato:
                      </p>
                      <div className="mt-1 font-mono text-[11px] bg-white text-gray-900 px-2 py-1 rounded border border-amber-300 inline-block font-semibold select-all">
                        noreply@deposito-bombal.firebaseapp.com
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-cerrar-modal-reset"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-secondary w-full"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form id="form-reset-password" onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="usuario@depositobombal.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    id="btn-cancelar-reset"
                    onClick={() => setShowForgotModal(false)}
                    disabled={isResetLoading}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-enviar-reset"
                    disabled={isResetLoading}
                    className="btn-primary shadow-xs"
                  >
                    {isResetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar enlace</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
