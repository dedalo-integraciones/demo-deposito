import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LogOut,
  ArrowLeft,
  Shield,
  Package,
  FolderTree,
  Layers,
  User,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import RubrosAdmin from '../components/admin/RubrosAdmin.jsx'
import CategoriasAdmin from '../components/admin/CategoriasAdmin.jsx'
import ProductosAdmin from '../components/admin/ProductosAdmin.jsx'
import MustChangePasswordModal from '../components/admin/MustChangePasswordModal.jsx'

export default function Admin() {
  const { user, isSuperAdmin, mustChangePasswordRequired, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('productos') // rubros, categorias, productos

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modal bloqueante para primer ingreso si requiere cambio de contraseña */}
      {mustChangePasswordRequired && <MustChangePasswordModal />}

      {/* Barra superior de administración */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                id="admin-btn-volver-catalogo"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                title="Volver al catálogo público"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Ver catálogo</span>
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[var(--primary)] font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900 leading-none">
                    Depósito Bombal
                  </h1>
                  <span className="text-xs text-gray-500">Panel de Administración</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Link a /usuarios visible ÚNICAMENTE para superadmin */}
              {isSuperAdmin && (
                <Link
                  to="/usuarios"
                  id="admin-btn-gestion-usuarios"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                  title="Gestión de usuarios del sistema"
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Gestión Usuarios</span>
                </Link>
              )}

              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-medium text-gray-800">{user?.email}</span>
              </div>

              <button
                type="button"
                id="admin-btn-logout"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xs:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal con Navegación por Pestañas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Selector de Pestañas */}
        <div className="border-b border-gray-200 bg-white px-4 rounded-xl border shadow-xs">
          <nav className="flex space-x-8 -mb-px overflow-x-auto" aria-label="Tabs">
            <button
              type="button"
              id="admin-tab-productos"
              onClick={() => setActiveTab('productos')}
              className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'productos'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Productos</span>
            </button>

            <button
              type="button"
              id="admin-tab-categorias"
              onClick={() => setActiveTab('categorias')}
              className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'categorias'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Categorías</span>
            </button>

            <button
              type="button"
              id="admin-tab-rubros"
              onClick={() => setActiveTab('rubros')}
              className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'rubros'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Rubros</span>
            </button>
          </nav>
        </div>

        {/* Vistas de cada pestaña */}
        {activeTab === 'productos' && <ProductosAdmin />}
        {activeTab === 'categorias' && <CategoriasAdmin />}
        {activeTab === 'rubros' && <RubrosAdmin />}
      </main>
    </div>
  )
}
