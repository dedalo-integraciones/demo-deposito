import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { PresupuestoProvider } from './context/PresupuestoContext.jsx'
import Home from './pages/Home.jsx'

// Lazy loading de rutas secundarias para aligerar el bundle inicial de navegación
const Admin = lazy(() => import('./pages/Admin.jsx'))
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage.jsx'))
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'))
const AdminAuthLayout = lazy(() =>
  import('./components/admin/AdminLayout.jsx').then((m) => ({ default: m.AdminAuthLayout }))
)
const AdminProtectedLayout = lazy(() =>
  import('./components/admin/AdminLayout.jsx').then((m) => ({ default: m.AdminProtectedLayout }))
)

// Carga perezosa de los archivos markdown de legales
const getTerminosMd = () => import('./legal/terminos-y-condiciones.md?raw').then((m) => m.default)
const getPrivacidadMd = () => import('./legal/politica-de-privacidad.md?raw').then((m) => m.default)

function LazyLegalRoute({ loader }) {
  const [content, setContent] = useState(null)

  useEffect(() => {
    let active = true
    loader().then((text) => {
      if (active) setContent(text)
    })
    return () => {
      active = false
    }
  }, [loader])

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfd]">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin text-[var(--primary)] shrink-0" />
      </div>
    )
  }

  return <LegalPage markdownContent={content} />
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin text-[var(--primary)] shrink-0" />
    </div>
  )
}

export default function App() {
  return (
    <PresupuestoProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/terminos"
            element={<LazyLegalRoute loader={getTerminosMd} />}
          />
          <Route
            path="/privacidad"
            element={<LazyLegalRoute loader={getPrivacidadMd} />}
          />

          {/* Rutas administrativas: carga perezosa de AuthProvider y verificación de sesión */}
          <Route element={<AdminAuthLayout />}>
            <Route path="/admin/login" element={<AdminLogin />} />
          </Route>
          <Route element={<AdminProtectedLayout />}>
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>
        </Routes>
      </Suspense>
    </PresupuestoProvider>
  )
}
