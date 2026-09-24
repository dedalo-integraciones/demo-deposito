# Proyecto: Depósito Bombal — Plataforma Catálogo online

Espec funcional completa: docs/data-init.md. Referencia visual (clonar estilo, NO lógica de compra): docs/Ejemplo.html.

## Datos de la empresa
Nombre: Depósito Bombal | Email: depositobombal.sa@hotmail.com | WhatsApp: +5492612430105
Dirección: Chile 171, Luján de Cuyo, Mendoza
Redes: Facebook e Instagram (ver docs/data-init.md) | Footer: "powered by Dédalo"

## Stack
React 18 + Vite | Firebase Firestore (datos) | Firebase Storage (imágenes, POSTERGADO, sin plan Blaze) | Firebase Auth (admin) | FormSubmit AJAX (formularios) | Deploy: Vercel | Repo: GitHub.

## REGLAS DE TRABAJO (obligatorias)
1. Ejecutá UN SOLO PASO del roadmap por vez. Al terminar, detenete y pedí confirmación antes de pasar al siguiente.
2. UI pública SIN PRECIOS NI CÓDIGOS/IDs. Solo mostrar: Descripción, Obs/Unidad, Descripción de Rubro, Descripción de Categoría. El ID del documento y codigoOrigen son de uso interno (admin y cuerpo de email 'Pedido Presupuesto'); el cliente nunca ve IDs ni códigos internos.
3. No hay carrito de compras: es CARRITO DE PRESUPUESTO (checkbox + cantidad por producto).
4. Todo texto de UI en español. Componentes funcionales + hooks. Estilos con variables CSS de src/index.css.
5. Nunca commitear .env. Config vía import.meta.env (ver .env.example).
6. IDUsuario = UID de Firebase Auth (string); el doc de la colección usuarios usa ese UID como ID y guarda { nombre, email, rol: 'ADMIN'|'SADMIN' }.
7. Flags activo/destacado/popular son BOOLEANOS (true/false).
8. Ordenamiento de consultas en cliente (v1). Consultas solo por igualdad (sin índices compuestos).
9. Imagen: string con path de Storage o URL externa provisoria mientras Storage esté postergado; '' si no hay.
10. No crear colecciones ni documentos sin aprobación explícita del dueño del proyecto (paso de seed).

## Modelo de datos Firestore (APROBADO por el dueño)
rubros/{ID autogenerado}: { descripcion: string, activo: boolean, imagen: string }
categorias/{ID autogenerado}: { idRubro: string ref->rubros, descripcion: string, observaciones: string, activo: boolean, imagen: string }
productos/{ID autogenerado (interno)}: { codigoOrigen: string (futura importación TIEMPO), descripcion: string, obsUnidad: string, idCategoria: string ref->categorias, activo: boolean, precio: number (no mostrar), alicuota: number (no mostrar), precioFinal: number (no mostrar), fechaAlta: timestamp, fechaActualizacion: timestamp, idUsuarioActualizacion: string ref->usuarios, destacado: boolean, popular: boolean, imagen: string }
usuarios/{UID de Auth}: { nombre: string, email: string, rol: 'ADMIN'|'SADMIN' }

Relaciones: rubros 1-N categorias; categorias 1-N productos; usuarios 1-N productos (idUsuarioActualizacion).
Normalizado (v1): las descripciones de rubro/categoría se resuelven con lecturas encadenadas.

## Formularios FormSubmit (endpoint AJAX, asunto indicado)
Todos con: sanitización de inputs, escape anti-XSS, HTTPS, rate limiting cliente (mín. 60 s entre envíos + debounce), campo honeypot oculto (_honey), maxlength por campo. Asuntos: "Pedido Presupuesto", "Solicitud Logística", "Consulta". Email destino: variable VITE_FORMSUBMIT_EMAIL (provisorio depositobombal.sa@hotmail.com).

## ROADMAP (ejecutar en orden, de a un paso)
PASO 1: Verificar conexión Firebase (isFirebaseConfigured en src/lib/firebase.js) y reportar estado.
PASO 2: Servicios de lectura src/services/ (rubros, categorias, productos) con consultas de activos (== true), sin orderBy (orden en cliente).
PASO 3: Hero a pantalla completa con imagen y datos de la empresa; categorías en sección independiente inmediatamente debajo
PASO 4: Sección Destacados (destacado == true) carrusel 1 línea + modal de producto.
PASO 5: Sección Productos: tarjetas de Rubros -> al tocar, Categorías del rubro + productos + indicador de navegación (breadcrumb); al tocar Categoría filtra productos; sin filtro muestra todos.
PASO 6: Carrito de presupuesto (checkbox + cantidad) + formulario Nombre/email/teléfono/dirección/mensaje + lista de seleccionados, FormSubmit "Pedido Presupuesto".
PASO 7: CTA 1 con parallax + formulario Nombre/Razón Social/email/teléfono/dirección/rubro/mensaje, FormSubmit "Solicitud Logística".
PASO 8: Populares (popular == true) + CTA 2 "Consulta" + botones flotantes WhatsApp/email/Maps + footer completo.
PASO 9: /admin login email+contraseña (Firebase Auth), "¿Olvidaste tu contraseña?" con sendPasswordResetEmail, ruta protegida por rol, cierre de sesión.
PASO 10: CRUD de Categorías y Productos (alta/modificación, campo codigoOrigen opcional) + carga de imagen por selector y drag&drop con validación de tamaño/tipo -> Firebase Storage (carpeta catalogo/) cuando Storage esté habilitado; mientras tanto URL externa o ''.
PASO 11: Seed inicial (1 usuario SADMIN, rubros/categorías/productos de ejemplo con booleanos) mediante script node scripts/seed.js, con aprobación previa del dueño.
PASO 12: Preparar deploy Vercel (variables de entorno, vercel.json) y verificación final de reglas firestore.rules/storage.rules.

## FUERA DE V1 (futuro, no implementar ahora)
- Importación de productos desde el sistema de gestión de ventas TIEMPO, mapeando por codigoOrigen.
- Índices compuestos / ordenamiento en servidor si el volumen lo requiere.
- Copias de seguridad programadas (requiere Blaze).