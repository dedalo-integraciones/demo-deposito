import { useState } from 'react'
import { ShieldAlert, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cambiarPasswordPrimerIngreso } from '../../services/usuariosService.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function MustChangePasswordModal() {
  const { clearMustChangePasswordFlag, refreshUserProfile, user } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await cambiarPasswordPrimerIngreso(newPassword)
      await refreshUserProfile()
      clearMustChangePasswordFlag()
      setSuccess(true)
    } catch (err) {
      console.error('[MustChangePasswordModal] Error:', err)
      setError(
        err?.message?.includes('requires-recent-login')
          ? 'Por motivos de seguridad, iniciá sesión nuevamente antes de cambiar la contraseña.'
          : err?.message || 'Error al actualizar la contraseña. Intentá nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Primer Ingreso: Cambiar Contraseña
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Por razones de seguridad, es necesario que actualices tu contraseña temporal antes de acceder al sistema.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-emerald-800">
              ¡Contraseña actualizada con éxito!
            </p>
            <p className="text-xs text-emerald-600">Ingresando al panel de administración...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Usuario (email)
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmar Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[var(--primary)] hover:opacity-95 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Actualizar Contraseña e Ingresar</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
