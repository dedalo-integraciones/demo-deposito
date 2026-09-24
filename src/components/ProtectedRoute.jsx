import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Loader2 } from 'lucide-react'

// Límite de inactividad: 15 minutos (en milisegundos)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

export default function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (!user) return

    // Reiniciar marca de actividad inicial
    lastActivityRef.current = Date.now()

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const checkInactivity = async () => {
      const now = Date.now()
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        try {
          await logout()
        } catch (err) {
          console.warn('[Inactividad] Error al cerrar sesión:', err)
        }
        sessionStorage.setItem('admin_inactivity_logout', 'true')
        navigate('/admin/login?inactividad=1', {
          replace: true,
          state: { inactivityNotice: true },
        })
      }
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    // Chequeo periódico cada 15 segundos
    const intervalId = setInterval(checkInactivity, 15000)

    // Al volver a enfocar la ventana o pestaña (por ejemplo, si el equipo estuvo suspendido o en otra app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkInactivity)

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkInactivity)
    }
  }, [user, logout, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          <p className="text-sm font-medium text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return children ? children : <Outlet />
}
