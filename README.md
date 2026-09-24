# README — DEMO DEPÓSITO · CATÁLOGO ONLINE

Documento de resguardo y memoria técnica del proyecto.
Estado: producción activa. Última actualización: post-implementación del ciclo de vida de la lista de presupuesto.

---

## 1. RESUMEN DEL PROYECTO

- **Naturaleza:** plataforma de catálogo de productos con solicitud de presupuestos. **NO es e-commerce:** sin carrito, sin pago online, sin stock en vivo.
- **Negocio:** Depósito Bombal — venta y distribución mayorista y minorista, Mendoza (Chile 171, Luján de Cuyo).
- **Flujo central:** el cliente público consulta el catálogo → arma su lista → pide presupuesto por email o WhatsApp → el negocio responde por su canal.
- **Volumen al cierre:** 516 productos activos (contador dinámico según toggles `activo`; 3 rubros: Alimentos, Almacén y Limpieza, Panadería).

## 2. STACK Y ARQUITECTURA

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | Vite + React (SPA) | Hosting en Vercel, `vercel.json` con rewrites SPA |
| Auth + DB | Firebase (plan Spark) | Auth email/password + Firestore |
| Imágenes | Cloudinary | Subida unsigned por preset |
| Formularios email | FormSubmit | Bandeja del negocio |
| WhatsApp | API `wa.me` | Mensaje preformateado, click-to-chat |
| Origen del código | Workspace GAS | Agente + `GEMINI.md` con reglas obligatorias |
| Pipeline | GAS → ZIP → carpeta limpia → `.bat` → GitHub → Vercel | Ver sección 9 |
| Env vars | `VITE_*` en Vercel | Config Firebase, Cloudinary cloud/preset, número WhatsApp, endpoint FormSubmit. Nada sensible hardcodeado en componentes |

Arquitectura sin backend propio: el cliente habla directo con Firestore (reglas como única capa de seguridad), Cloudinary y los canales de envío.

## 3. COLECCIONES FIRESTORE

- **productos:** nombre, unidad, imagen (URL Cloudinary), `activo`, pertenencia a rubro/categoría, marcadores de destacado y popular.
- **categorias** y **rubros:** con `activo`; alimentan el árbol público con contadores.
- **usuarios:** ID de documento = UID; `rol` (SADMIN / ADMIN / vendedor), `mustChangePassword`, `updatedAt`.
- **meta/catalogoVersion:** sello de versión del catálogo (base del sistema de caché).
- **cloudinary_borrados_pendientes:** registro de huérfanos al reemplazar/quitar imágenes.

## 4. ROLES Y SEGURIDAD (reglas publicadas vigentes)

- Helpers `esSuperAdmin()` (por rol o por email: `depositobombal.sa@hotmail.com`, `nelsonhammerle@gmail.com`) y `esAdmin()` (incluye ADMIN y vendedor).
- **rubros / categorias / productos:** lectura pública si `activo == true` o esAdmin; escritura solo esAdmin.
- **meta:** lectura pública (sello de versión); escritura esAdmin.
- **usuarios:** lectura propia o listado completo para superadmin; create y delete solo superadmin; update de superadmin o del propio usuario **limitado a `hasOnly(['mustChangePassword','updatedAt'])`** (cláusula C-02 de la auditoría).
- **cloudinary_borrados_pendientes:** lectura/escritura esAdmin.
- Todo lo no mencionado: denegado por default.
- Primer login: cambio de contraseña forzado vía `mustChangePassword`.

## 5. FUNCIONALIDADES PÚBLICAS IMPLEMENTADAS

- Header con navegación (Destacados, Catálogo, Populares, Atención al cliente, indicador de presupuesto).
- Hero con propuesta de valor y CTA WhatsApp.
- **Destacados:** carrusel con centrado de primera tarjeta en mobile (375/480px).
- **Catálogo:** árbol de rubros con contadores, filtro por categoría, búsqueda por descripción, y **paginación por líneas llenas**: 5 líneas por corte (25 productos ≥1400px / 20 en 1024px / 10 en 375px), botón "Ver más líneas" que suma 5 líneas completas, y terminador de fin de catálogo (última línea truncada + línea completa "Fin del catálogo · N productos").
- Detalle de producto.
- **Populares:** artículos más consultados.
- **Formularios:** pedido de presupuesto (ver sección 6), contacto de proveedores (alianza estratégica), consultas de clientes.
- Footer con datos reales de contacto y legales.

## 6. FLUJO DE PRESUPUESTO (corazón del negocio)

- Lista armada con botón "Presupuestar" por tarjeta; botón flotante con contador.
- Formulario con datos del cliente; validación única compartida por ambos canales.
- **Doble canal de envío:**
  - **Email:** FormSubmit a la bandeja del negocio.
  - **WhatsApp:** `wa.me` con mensaje formateado (negritas, lista numerada con cantidades, datos del cliente, observaciones); número tomado de la config del proyecto; aviso post-apertura "Se abrió WhatsApp con tu pedido listo: dale enviar para completarlo"; fallback con link visible si la pestaña no abre.
- **Ciclo de vida de la lista (localStorage del cliente):**
  - Campos: `estado` ('borrador' | 'enviado'), `fechaGuardado`, `fechaEnvio`, `canal`.
  - **Nunca se vacía sola al enviar** (el envío real de WhatsApp ocurre fuera de la app).
  - Al abrir con lista enviada: banner "Esta lista se envió el [fecha] por [canal]" + acciones "Iniciar lista nueva" / "Reusar como borrador". Con borrador: aviso "Borrador guardado el [fecha]" + continuar / vaciar.
  - **TTL:** borradores 30 días; enviadas 90 días (semilla del futuro "Repetir último pedido"); expiración silenciosa.
  - **Contrastación sin lecturas extra:** al abrir, cada ítem se valida contra el catálogo local del sistema de versión (cero reads adicionales a Firestore); productos `activo=no` o inexistentes → "No disponible", grisados, excluidos del envío, con quitado en un clic.

## 7. PANEL DE ADMINISTRACIÓN

- **Bypass de caché:** siempre lectura real; errores técnicos visibles con código y mensaje completos (nada oculto al administrador).
- ABM de productos, categorías y rubros con toggle **activo sí/no** (apagar sin borrar).
- Imágenes: subida/reemplazo unsigned en Cloudinary; el reemplazo registra el huérfano en `cloudinary_borrados_pendientes`.
- Usuarios: creación por superadmin, roles, primer login con cambio forzado de contraseña.

## 8. RENDIMIENTO Y RESILIENCIA

- **Caché con sello de versión:** 1 lectura por carga (`meta/catalogoVersion`); refetch del catálogo completo solo si el sello cambió; catálogo completo vive en localStorage.
- **Degradación elegante ante agotamiento de cuota / errores de lectura:**
  - Con caché: sirve la última versión + banner discreto "El contenido puede estar momentáneamente desactualizado. Estamos trabajando para normalizar el servicio."
  - Sin caché: pantalla amable "Estamos con mucha demanda en este momento. Probá de nuevo en unas horas." + botón Reintentar + contacto WhatsApp.
  - *Deuda conocida:* el cartel se dispara ante cualquier error de lectura (incluido permission-denied); pendiente acotarlo a `resource-exhausted`.
- **Cuota Spark de referencia:** 50k lecturas/día, 20k escrituras/día, 1 GB storage, 10 GB egress/mes; reset diario a medianoche hora del Pacífico.
- **Optimización v2 propuesta (NO implementada):** documentos bundle (~11 lecturas por catálogo completo).

## 9. PIPELINE DE DEPLOY

1. Workspace GAS = fuente de verdad (reglas en `GEMINI.md`).
2. Export ZIP → carpeta local limpia.
3. Verificar `vercel.json` (rewrites SPA).
4. `.bat` → push a GitHub → deploy automático en Vercel.

**Regla de oro:** los cambios locales fuera de GAS **no persisten** (el próximo ZIP los pisa). Todo cambio de código o `package.json` se hace en GAS.

## 10. LOG DE INCIDENTES Y DECISIONES

- **Día de testing con 63k lecturas:** Spark rechazó lecturas hasta el reset; la degradación operó en producción tal cual el diseño (modo sin caché). Sin impacto para clientes reales.
- **Permission-denied anónimo en `meta/catalogoVersion`:** el sello de versión se deployó sin actualizar reglas; se resolvió con reemplazo completo del archivo de reglas (agregados `meta` y `cloudinary_borrados_pendientes`, y aplicación real de C-02).
- **Monitoreo:** alerta de métricas en Spark descartada por decisión; en el handover se configura **budget alert en Blaze** (50%/90% al mail del cliente).
- **Base de datos futura:** Convex evaluado y descartado (pricing por developer, sin backups diarios en free); **Supabase elegido como stack preferido para proyectos nuevos**; este proyecto permanece en Firestore.
- **Modelo de handover "piloto automático":** cuentas 100% a nombre del cliente, débito automático con su tarjeta, acta firmada con cláusula de responsabilidad, firma electrónica (Signatura/Contractia; PandaDoc para flujo comercial futuro).

## 11. DEUDAS POST-FIRMA (priorizadas)

1. Acotar banner de degradación a `resource-exhausted`.
2. Bundles v2 (~11 lecturas por catálogo).
3. Botón "Repetir último pedido" (semilla ya almacenada por el ciclo de vida).
4. Remover dependencia `express` de `package.json` desde GAS (no hay servidor Node en el proyecto).
5. Budget alert + Blaze en el handover.
6. Handover completo según `MINUTA_HANDOVER.md` + `ACTA_DE_ENTREGA.md`.

## 12. DOCUMENTOS DEL PROYECTO (resguardo)

- `ACTA_DE_ENTREGA.md` — acta de handover y cláusula de responsabilidad.
- `MINUTA_HANDOVER.md` — gestión del traspaso piloto automático + anexo de firma electrónica.
- `GUION_VIDEO_DEMO.md` — guion del clip comercial.
- `PERFIL_DE_TRABAJO.md` — perfil de método para sesiones de trabajo.
- `README.md` — este documento.

## 13. DATOS DE REFERENCIA DEL NEGOCIO

- WhatsApp: +54 9 261 243-0105.
- Mail de contacto: depositobombal.sa@hotmail.com.
- Superadmins en reglas: depositobombal.sa@hotmail.com, nelsonhammerle@gmail.com.
- Contador de productos: dinámico (516 al cierre); en piezas comerciales usar "más de 500".

## 14. CONTINUIDAD DEL PROYECTO

### 14.1 Enlaces de referencia

| Recurso | URL | Qué es |
|---|---|---|
| **Chat maestro de desarrollo** | https://chat.qwen.ai/c/25bc5baa-f47c-4818-942e-94cbb184cb11 | Historial completo de decisiones técnicas, prompts a GAS, resolución de incidentes y evolución del producto. Útil para entender el *por qué* de cada decisión. |
| **Google AI Studio (agente GAS)** | https://aistudio.google.com/apps/6091befd-2eb7-4eca-9691-95470d2a1893?showPreview=true&showAssistant=true&project=gen-lang-client-0151002318 | Entorno de trabajo del agente que genera el código fuente. Contiene el `GEMINI.md` con las reglas obligatorias del proyecto y es la fuente de verdad del código. |
| **Repositorio GitHub** | https://github.com/dedalo-integraciones/depositobombal.git | Deploy a Vercel vía push. El código aquí es una **instantánea de cada ZIP exportado desde GAS**; no editar manualmente (se pisa en el próximo deploy). |

### 14.2 Protocolo de onboarding (retomar después de pausa)

Si este proyecto se retoma tras días, meses o por un dev nuevo, este es el orden estricto de lectura y verificación antes de tocar código:

**Día 1 — Lectura (no tocar nada):**
1. Leer este README completo (30 min).
2. Leer `PERFIL_DE_TRABAJO.md` (define método de trabajo y vocabulario).
3. Leer `MINUTA_HANDOVER.md` + `ACTA_DE_ENTREGA.md` si el proyecto ya fue entregado al cliente.
4. Navegar el chat maestro para entender decisiones abiertas.

**Día 2 — Verificación de estado (sin cambios):**
1. Abrir producción en incógnito → recorrer flujo público completo.
2. Abrir panel admin → verificar login, ABM de producto, toggle activo sí/no.
3. Probar envío de presupuesto por email y WhatsApp.
4. Verificar reglas de Firestore vigentes (Firebase Console → Rules).
5. Revisar contadores de lectura de Firestore en Monitoring (consumo vs cuota).

**Día 3 — Primera intervención real:**
- Siempre partir desde GAS (Google AI Studio), nunca editar localmente.
- Un prompt a la vez, una verificación a la vez.
- Export → carpeta limpia → `.bat` → deploy.

### 14.3 Puntos de contacto críticos (si algo caduca)

- **Tarjeta de Cloudinary / Vercel / Google Cloud:** si alguna se vence, la infraestructura sigue andando con los planes free, pero el cliente debe actualizarla antes de que expire. Ver `MINUTA_HANDOVER.md` sección 1.
- **Dominio:** renovación automática en el registrador del cliente.
- **FormSubmit:** gratuito sin tarjeta, solo verificar que el endpoint siga activo.
- **Vercel free tier:** si el cliente supera límites, considerar plan Pro.

### 14.4 Notas para futuros desarrolladores

- **No modificar `vercel.json` localmente** (se sobreescribe con cada ZIP de GAS).
- **No agregar dependencias de backend** (express, cors, etc.) — el proyecto es SPA pura.
- **Cualquier cambio de reglas de Firestore** debe ir acompañado de testing en producción con sesión anónima en incógnito.
- **El código vive en GAS, no en GitHub:** el repo es solo un canal de deploy. Para modificar, ir siempre al Google AI Studio.

## 15. BITÁCORA DE DECISIONES CLAVE

Decisiones arquitectónicas y de producto que no están explícitas en el código pero que un yo-futuro necesita entender sin releer el chat maestro:

| Fecha (aprox) | Decisión | Por qué |
|---|---|---|
| Sep 2026 | **Firestore sobre Supabase** para este proyecto | Supabase pausa proyectos inactivos tras ~7 días en free tier, incompatible con el modelo "piloto automático" del handover. Firestore aguanta el modo "nadie mira". |
| Sep 2026 | **Convex descartado** como alternativa | Pricing por developer ($25/dev/mes en Professional), sin backups diarios en free. Incompatible con modelo de costo por uso del cliente. |
| Sep 2026 | **Banner de degradación genérico** (no solo `resource-exhausted`) | Pragmático: cubre cuota + permission-denied + errores de red con un solo mensaje. Deuda técnica documentada en sección 11. |
| Sep 2026 | **Doble canal de envío** (email + WhatsApp) | WhatsApp es la caja registradora del comercio argentino. El mensaje preformateado con lista numerada convierte el formulario en una orden de compra lista para trabajar. |
| Sep 2026 | **Lista nunca se auto-vacía al enviar** | El envío real de WhatsApp ocurre fuera de la app; si el usuario abre y no envía, no se le debe destruir la lista armada. |
| Sep 2026 | **TTL 30 días borradores / 90 días enviadas** | El cliente tipo es mayorista recurrente (pedidos semanales/mensuales); 7 días sería mutilar el caso de uso. 90 días de enviadas es semilla del futuro "Repetir último pedido". |
| Sep 2026 | **Contrastación contra caché local, no contra Firestore** | Evita lecturas extra al abrir la lista. Valida contra el catálogo ya cacheado por el sistema de versión. |
| Sep 2026 | **Handover piloto automático** como diseño | El desarrollador no debe ser punto único de falla del negocio del cliente. Cuentas, pagos y alertas 100% a nombre del cliente con débito automático y presupuesto mensual. |
| Sep 2026 | **Firma electrónica** (no digital con token) | Firma simple con trazabilidad (mail, IP, timestamp, hash) es legalmente suficiente para este tipo de acta bajo Ley 25.506 y CCyC 286-288. Plataformas: Signatura / Contractia. |
| Sep 2026 | **Video comercial en lugar de demo en vivo** | Elimina riesgo técnico, permite narración controlada, y el cliente lo puede compartir con su equipo. Plan B que terminó siendo plan A. |

---


Configuración recomendada en el panel de Cloudflare Pages
En tu panel de Cloudflare Pages (Settings > Builds & deployments > Build configurations / Environment variables):
Build settings:
Framework preset: Vite (o None)
Build command: npm run build
Build output directory: dist
Environment variables (Variables de entorno de compilación):
Agregá la variable:
Variable name: NODE_VERSION
Value: 20.18.0
Con este ajuste y los nuevos archivos de control de versión en el repositorio, la próxima compilación en Cloudflare Pages completará la instalación de dependencias y el build de Vite exitosamente.


**Fin del documento.** Este README es vivo: actualizar cada vez que se cierre una deuda de la sección 11, se tome una decisión nueva, o cambie un contacto crítico.