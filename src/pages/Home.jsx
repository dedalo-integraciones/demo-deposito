import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import Destacados from '../components/Destacados.jsx'
import SeccionProductos from '../components/SeccionProductos.jsx'
import CtaLogistica from '../components/CtaLogistica.jsx'
import Populares from '../components/Populares.jsx'
import CtaConsulta from '../components/CtaConsulta.jsx'
import Footer from '../components/Footer.jsx'
import BotonFlotanteCarrito from '../components/BotonFlotanteCarrito.jsx'
import CarritoDrawer from '../components/CarritoDrawer.jsx'
import BotonesFlotantesContacto from '../components/BotonesFlotantesContacto.jsx'

// Catálogo público. Cada sección se implementa siguiendo el roadmap de GEMINI.md.
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />

      <main className="flex-1">
        <Hero />
        <Destacados />
        <SeccionProductos />
        <CtaLogistica />
        <Populares />
        <CtaConsulta />
      </main>

      <Footer />

      {/* Carrito de presupuesto + formulario de Pedido Presupuesto */}
      <BotonFlotanteCarrito />
      <CarritoDrawer />

      {/* Botones flotantes de WhatsApp, email y Google Maps (esquina inferior izquierda) */}
      <BotonesFlotantesContacto />
    </div>
  )
}
