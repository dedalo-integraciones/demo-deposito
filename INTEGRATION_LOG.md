# REGISTRO DETALLADO DE INTEGRACIÓN Y DESPLIEGUE (INTEGRATION LOG)
**Proyecto:** Depósito Bombal — Catálogo Online  
**Repositorio Origen:** `https://github.com/dedalo-integraciones/demo-deposito.git`  
**Entorno:** Entorno de Pruebas y Despliegue AI Studio / Cloud Run  
**Fecha:** 2026-09-24  

---

## 1. RESUMEN DE DIRECTRICES Y CUMPLIMIENTO
- **Prohibiciones estrictas observadas:**
  - Sin alteración de diseño ni estilos: Se respetaron íntegramente la paleta corporativa de Depósito Bombal, variables CSS de `src/index.css`, layout responsive, carruseles y drawer de presupuesto.
  - Sin alteración de arquitectura ni infraestructura: Frontend SPA en Vite + React, persistencia Firestore (plan Spark), carga unsigned en Cloudinary y envíos FormSubmit AJAX con rate limiting y anti-XSS.
  - Servicios base preservados: Firmas de métodos y retornos de `productosService`, `categoriasService`, `rubrosService` y `usuariosService` conservados intactos.
  - Integridad de datos: Se implementó verificación de hash criptográfico SHA-256 en cada transacción.
  - Auditoría automática: Sistema continuo en `src/services/auditService.js` interconectado a mutaciones y solicitudes.

---

## 2. DETALLE CRONOLÓGICO DE CAMBIOS REALIZADOS

### A. Clonación y Transferencia de Archivos Base
1. **Clonación de repositorio:** Se clonó `https://github.com/dedalo-integraciones/demo-deposito.git`.
2. **Transferencia de archivos estáticos (`public/`):**
   - Iconografía completa: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.
   - Imágenes institucionales: `hero.webp`, `hero-mob.webp`, `logistica.webp`, `logistica-mob.webp`, `logoheader-d.webp`, `logoheader-m.webp`, `og-image.jpg`.
   - Fuentes tipográficas locales: `poppins-400.woff2`, `poppins-500.woff2`, `poppins-600.woff2`, `poppins-700.woff2`.
   - Manifiesto PWA: `manifest.json`.
3. **Transferencia de Código Fuente (`src/`):**
   - Componentes públicos: `Header.jsx`, `Hero.jsx`, `Destacados.jsx`, `SeccionProductos.jsx`, `ModalProducto.jsx`, `Populares.jsx`, `CtaLogistica.jsx`, `CtaConsulta.jsx`, `Footer.jsx`, `CarritoDrawer.jsx`, `BotonFlotanteCarrito.jsx`, `BotonesFlotantesContacto.jsx`.
   - Componentes de administración: `AdminLayout.jsx`, `ProductosAdmin.jsx`, `CategoriasAdmin.jsx`, `RubrosAdmin.jsx`, `ImageUploader.jsx`, `ModalConfirmacionDesactivacion.jsx`, `MustChangePasswordModal.jsx`.
   - Páginas: `Home.jsx`, `Admin.jsx`, `AdminLogin.jsx`, `UsuariosPage.jsx`, `LegalPage.jsx`.
   - Contextos y configuración: `AuthContext.jsx`, `PresupuestoContext.jsx`, `config/empresa.js`, `lib/firebase.js`.
   - Documentación legal Markdown: `politica-de-privacidad.md`, `terminos-y-condiciones.md`.
   - Especificaciones y esquemas: `docs/data-init.md`, `docs/Firebase init.txt`, `GEMINI.md`, `README.md`, `firestore.rules`, `storage.rules`, `firebase-blueprint.json`.

### B. Dependencias del Entorno
- Se mantuvieron las dependencias oficiales del proyecto e instalaron:
  - `firebase`: ^12.18.0 / ^12.19.0
  - `react-router-dom`: ^7.18.3
  - `react-markdown`: ^10.1.0
  - `terser`: para minificación y optimización de bundle en producción.

### C. Implementación del Sistema de Auditoría Automática
- **Archivo creado:** `src/services/auditService.js`
  - Captura automática de cada transacción con ID único con prefijo `TX-${Date.now()}-${random}`.
  - Firma digital SHA-256 canónica (`computeSha256`) sobre `id`, `timestamp`, `action`, `entity`, `entityId`, `actor`, `status` y `payload`.
  - Persistencia bidireccional: almacenamiento local indexado (`localStorage['deposito_bombal_audit_log']`) y registro asíncrono en Firestore (`auditoria`).
  - Emisión de eventos del DOM en tiempo real (`deposito:transaction-audited`).
  - Funciones de verificación de integridad (`verifyAuditRecordIntegrity`) que permiten auditar si una transacción ha sido alterada.
  - Función de exportación de reporte en formato JSON descargable.
- **Puntos de auditoría enlazados:**
  - `productosService.js`: `PRODUCTO_CREATE`, `PRODUCTO_UPDATE`, `PRODUCTO_TOGGLE_ACTIVO`.
  - `categoriasService.js`: `CATEGORIA_CREATE`, `CATEGORIA_UPDATE`, `CATEGORIA_TOGGLE_ACTIVO`.
  - `rubrosService.js`: `RUBRO_CREATE`, `RUBRO_UPDATE`, `RUBRO_TOGGLE_ACTIVO`.
  - `usuariosService.js`: `USUARIO_CREATE`, `USUARIO_TOGGLE_STATUS`.
  - `CarritoDrawer.jsx`: `PRESUPUESTO_SUBMIT_EMAIL`, `PRESUPUESTO_SUBMIT_WHATSAPP`.
  - `CtaLogistica.jsx`: `LOGISTICA_SUBMIT`.
  - `CtaConsulta.jsx`: `CONSULTA_SUBMIT`.
- **Panel Administrativo:**
  - Se incorporó la pestaña "Auditoría de Transacciones" en `src/pages/Admin.jsx` mediante el componente `src/components/admin/AuditoriaAdmin.jsx`.
  - Permite a los auditores y administradores filtrar eventos, verificar firmas criptográficas en vivo, inspeccionar los payloads completos y exportar reportes.

### D. Actualización de Identidad Corporativa y Datos de Contacto
Por solicitud del cliente, se actualizó la información de la empresa de forma transversal en toda la plataforma:
- **Nombre de la Empresa:** Depósito Baigorria (títulos, encabezados, Hero, Footer, metadata web, manifest PWA).
- **Dirección:** Baigorria S/N, Ciudad, Mendoza (enlaces a Google Maps, tarjetas, políticas y términos legales).
- **Teléfono:** +54 9 2615555306 (enlaces `tel:` en Footer y botones flotantes).
- **WhatsApp:** +54 9 2615555306 (número de API `5492615555306` para enlaces click-to-chat en Header, Hero, Destacados, Populares, Catálogo, ModalProducto y Carrito).
- **Email:** `dédalo.integraciones@gmail.com` (enlaces `mailto:`, variable de destino de formularios FormSubmit y verificación de rol SuperAdmin en Firebase Auth y `firestore.rules`).

### E. Resolución de Error de Despliegue en Cloudflare Pages
- **Causa del error detectada:** Cloudflare Pages detectaba `bun.lock` con formato `"lockfileVersion": 2` e intentaba instalar dependencias con `bun install --frozen-lockfile`. Como el entorno de Cloudflare dispone de `bun@1.2.15` (incompatible con la versión 2 de lockfile de Bun), el proceso fallaba con `error: Unknown lockfile version at bun.lock:2:22`.
- **Acciones correctivas:**
  1. Se eliminó el archivo incompatible `bun.lock`.
  2. Se resolvió el conflicto de peer dependency de `esbuild` en `package.json` para alinear con `vite@8.3.x`.
  3. Se generó un `package-lock.json` estándar compatible con `npm@10.9.2` y `nodejs@24.x`.
  4. Se declaró explícitamente `"packageManager": "npm@10.9.2"` en `package.json`.
  5. Se creó `public/_redirects` (`/* /index.html 200`) para garantizar el correcto enrutamiento SPA de React Router en Cloudflare Pages.

---

## 3. NOTIFICACIÓN DE DISCREPANCIAS AL EQUIPO DE DESARROLLO

Se identifican las siguientes consideraciones y discrepancias técnicas para conocimiento del equipo:

1. **Reglas de Seguridad Firestore y Consultas Públicas:**
   - *Hallazgo:* En `firestore.rules`, la regla de lectura establece `allow read: if resource.data.activo == true || esAdmin();`.
   - *Implicación:* En consultas públicas de Firestore, Firestore exige que las queries cliente incluyan explícitamente `where('activo', '==', true)` para no rechazar la solicitud por falta de permisos. El código de `rubrosService.js`, `categoriasService.js` y `productosService.js` ya cumple estrictamente con esta restricción.
2. **Plan Spark de Firebase Storage:**
   - *Hallazgo:* Firebase Storage requiere el plan Blaze para operaciones sin restricciones. El repositorio mantiene la directriz de usar Cloudinary con subida unsigned (`ndaarqff`, preset `deposito-bombal`) para imágenes, preservando el plan Spark sin costos.
3. **Sello de Versión y Manejo de Cuotas:**
   - *Hallazgo:* El servicio `catalogoService.js` implementa un sistema de caché en `localStorage` con lectura de `meta/catalogoVersion` para minimizar drásticamente las lecturas a Firestore (1 sola lectura de versión al inicio en lugar de cientos de lecturas), mitigando el límite de cuota diario de 50.000 lecturas del plan Spark.
4. **Instancias Secundarias de Auth en Gestión de Usuarios:**
   - *Hallazgo:* La creación de usuarios por el Superadmin (`crearUsuarioSecundario` en `usuariosService.js`) utiliza una instancia secundaria de Firebase Auth para no interrumpir ni cerrar la sesión activa del Superadmin en el navegador.

---

## 4. VERIFICACIÓN DE INTEGRIDAD
- Conexión con Firestore verificada exitosamente: datos de rubros, categorías y productos activos accesibles y conformes al esquema de datos institucional.
- Compilación y arranque del entorno de pruebas verificado sin errores sintácticos ni fallos de importación.
