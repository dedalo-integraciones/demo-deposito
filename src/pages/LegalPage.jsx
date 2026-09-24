import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Markdown from 'react-markdown'
import { ArrowLeft } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import BotonFlotanteCarrito from '../components/BotonFlotanteCarrito.jsx'
import CarritoDrawer from '../components/CarritoDrawer.jsx'
import BotonesFlotantesContacto from '../components/BotonesFlotantesContacto.jsx'

export default function LegalPage({ markdownContent }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [markdownContent])

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-800">
      <Header />

      <main className="flex-1 w-full bg-[#fcfcfd]">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 py-[60px]">
          {/* Opción superior de Volver al Catálogo */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[var(--primary)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Volver al Catálogo</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10 md:p-12">
            <Markdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--primary)] mb-6 tracking-tight"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--primary)] mt-10 mb-4 tracking-tight border-b border-gray-100 pb-2.5"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-base sm:text-lg font-bold text-gray-900 mt-6 mb-3"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="text-base text-gray-700 leading-[1.8] mb-5"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc list-inside space-y-2 text-base text-gray-700 leading-[1.8] mb-5 pl-1"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal list-inside space-y-2 text-base text-gray-700 leading-[1.8] mb-5 pl-1"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-base text-gray-700 leading-[1.8]" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-[var(--primary)] hover:underline font-semibold transition-colors"
                    {...props}
                  />
                ),
              }}
            >
              {markdownContent}
            </Markdown>

            {/* Separador y opción inferior de Volver al Catálogo */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
              <Link
                to="/"
                className="btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Catálogo</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Carrito de presupuesto + drawer + botones de contacto */}
      <BotonFlotanteCarrito />
      <CarritoDrawer />
      <BotonesFlotantesContacto />
    </div>
  )
}
