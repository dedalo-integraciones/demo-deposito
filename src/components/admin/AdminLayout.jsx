import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext.jsx'
import ProtectedRoute from '../ProtectedRoute.jsx'

export function AdminAuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

export function AdminProtectedLayout({ children }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        {children || <Outlet />}
      </ProtectedRoute>
    </AuthProvider>
  )
}
