import { Link } from 'react-router-dom'
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Facebook,
  Instagram,
  Shield,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { EMPRESA } from '../config/empresa.js'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-gray-900 text-gray-300 border-t border-gray-800">
      {/* Contenedor principal de columnas con padding vertical amplio */}
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Columna 1: Marca y Redes Sociales (solo íconos) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/logoheader-d.webp"
                alt="Depósito Bombal"
                className="h-10 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-white">
                  Depósito <span className="text-red-500">Bombal</span>
                </span>
                <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
                  Catálogo Online
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-[1.8]">
              Venta y distribución mayorista y minorista en Mendoza. Armá tu lista y solicitá tu presupuesto personalizado sin compromiso.
            </p>
            {/* Redes sociales: solo íconos */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={EMPRESA.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de Depósito Bombal"
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-[#1877F2] text-gray-300 hover:text-white flex items-center justify-center transition-colors shadow-xs"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={EMPRESA.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Depósito Bombal"
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] text-gray-300 hover:text-white flex items-center justify-center transition-all shadow-xs"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Columna 2: Datos de Contacto (Dirección Maps, Teléfono, WhatsApp, Email) */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Datos de Contacto
            </h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-1" />
                <a
                  href={EMPRESA.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors leading-[1.8]"
                >
                  {EMPRESA.direccion}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <a
                  href={`tel:${EMPRESA.telefonoLink}`}
                  className="hover:text-white transition-colors leading-[1.8]"
                  title="Llamar a Depósito Bombal"
                >
                  {EMPRESA.telefono}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <a
                  href={`https://wa.me/${EMPRESA.whatsappNumero}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors leading-[1.8]"
                  title="Escribir por WhatsApp"
                >
                  {EMPRESA.telefono} (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />
                <a
                  href={`mailto:${EMPRESA.email}`}
                  className="hover:text-white transition-colors break-all leading-[1.8]"
                >
                  {EMPRESA.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información y Legal (Enlaces directos a /terminos y /privacidad) */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Información y Legal
            </h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <Link
                  to="/terminos"
                  className="hover:text-white transition-colors inline-flex items-center gap-2 text-left leading-[1.8]"
                >
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Términos y Condiciones</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/privacidad"
                  className="hover:text-white transition-colors inline-flex items-center gap-2 text-left leading-[1.8]"
                >
                  <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Políticas de Privacidad</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Atención Comercial (Compacto en una línea descriptiva) */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Atención Comercial
            </h3>
            <p className="text-sm text-gray-400 leading-[1.8]">
              Atención a pedidos mayoristas y minoristas con logística y entrega coordinada en Mendoza.
            </p>
          </div>
        </div>
      </div>

      {/* Barra inferior de Copyright en línea separada y fondo más oscuro */}
      <div className="w-full border-t border-gray-800/90 bg-gray-950 py-6">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p className="text-center sm:text-left leading-[1.8]">
            © {currentYear} {EMPRESA.nombre}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://dedalointegraciones.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 font-medium text-gray-400 hover:text-cyan-300 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(103,232,249,0.85)] leading-[1.8]"
              title="Dédalo Integraciones"
            >
              <span>powered by</span>
              <span className="text-gray-200 font-semibold tracking-wide group-hover:text-cyan-300 transition-colors">
                Dédalo
              </span>
            </a>

            {/* Escudo de acceso a administración a su lado */}
            <Link
              to="/admin"
              className="text-gray-600 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)] transition-all duration-300 p-1 rounded-md"
              title="Acceso Administración"
              aria-label="Acceso al panel de administración"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
