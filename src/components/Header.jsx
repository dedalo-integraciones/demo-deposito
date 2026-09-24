import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, FileSpreadsheet } from 'lucide-react'
import { usePresupuesto } from '../context/PresupuestoContext.jsx'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { totalProducts, openDrawer } = usePresupuesto()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const navItems = [
    { label: 'Destacados', href: '#destacados' },
    { label: 'Catálogo', href: '#productos' },
    { label: 'Populares', href: '#populares' },
    { label: 'Atención al cliente', href: '#atencion-cliente' },
  ]

  const handleNavClick = (e, href) => {
    setIsMobileMenuOpen(false)
    if (location.pathname === '/') {
      e.preventDefault()
      const targetElement = document.querySelector(href)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleLogoClick = (e) => {
    setIsMobileMenuOpen(false)
    if (location.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm'
          : 'bg-white border-b border-gray-200 shadow-xs'
      }`}
    >
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 flex items-center justify-between h-[var(--header-height)] py-3">
        {/* Lado izquierdo: Botón menú para mobile/tablet + Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón hamburguesa / cerrar a la izquierda en mobile y tablet */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-700 hover:text-[var(--primary)] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo / Marca */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
          >
            {/* Logo modo desktop */}
            <img
              src="/logoheader-d.webp"
              alt="Depósito Bombal"
              className="hidden sm:block h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
            {/* Logo modo mobile */}
            <img
              src="/logoheader-m.webp"
              alt="Depósito Bombal"
              className="block sm:hidden h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg sm:text-xl leading-tight tracking-tight text-[var(--text)]">
                Depósito <span className="text-[var(--primary)]">Bombal</span>
              </span>
              <span className="text-[10px] sm:text-xs text-[var(--muted)] tracking-wider uppercase">
                Catálogo Online
              </span>
            </div>
          </Link>
        </div>

        {/* Lado derecho: Menú de Navegación Desktop + Botón Icono de Presupuesto */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
          {/* Menú de Navegación Desktop */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-1 lg:gap-3 xl:gap-4"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={location.pathname === '/' ? item.href : `/${item.href}`}
                onClick={(e) => handleNavClick(e, item.href)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:text-[var(--primary)] hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Icono de Presupuesto con indicador de items */}
          <button
            type="button"
            id="btn-header-presupuesto"
            onClick={openDrawer}
            aria-label={`Abrir carrito de presupuesto (${totalProducts} items)`}
            title="Presupuesto"
            className="relative p-2 sm:p-2.5 rounded-xl text-[var(--primary)] hover:bg-red-50/80 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center group"
          >
            <FileSpreadsheet className="w-6 h-6 group-hover:scale-105 transition-transform" />
            {totalProducts > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-[var(--primary)] text-white font-extrabold text-[11px] rounded-full flex items-center justify-center shadow-xs border-2 border-white leading-none">
                {totalProducts > 99 ? '99+' : totalProducts}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Menú desplegable hacia abajo en Mobile y Tablet (100% opaco, lista completa visible) */}
      {isMobileMenuOpen && (
        <div className="md:hidden w-full bg-white border-t border-gray-200 shadow-xl">
          <nav aria-label="Navegación móvil" className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={location.pathname === '/' ? item.href : `/${item.href}`}
                onClick={(e) => handleNavClick(e, item.href)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold text-gray-800 hover:text-[var(--primary)] hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <span>{item.label}</span>
                <span className="text-gray-400 text-sm font-normal">›</span>
              </a>
            ))}
          </nav>
          <div className="px-6 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-center text-gray-500 font-medium">
            Depósito Bombal · Catálogo Online
          </div>
        </div>
      )}
    </header>
  )
}

