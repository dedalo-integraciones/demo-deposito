##### **Plataforma Catálogo online**



**Nombre de la empresa: Depósito Bombal**

**email: depositobombal.sa@hotmail.com**

**Whatsapp: +5492612430105**

**dirección: Chile 171, Luján de Cuyo, Mendoza**

**redes sociales: https://www.facebook.com/profile.php?id=100063650979539, https://www.instagram.com/p/C1nX4jxJJKv/**



##### **Funcionalidad Catálogo**



**Sección Hero**

* debe ocupar 1/2 pantalla mostrando logo, datos empresa, email, redes, teléfono
* La otra mitad de pantalla debe mostrar tarjetero de categorías en modo carrusel 1 línea



**Sección Destacados**

* Tarjetero sección productos destacados \[true] en modo carrusel 1 línea
* Al hacer click en el producto se debe mostrar modal con Código, Descripción, Descripción de Rubro, Descripción de Categoría
* Solo debe mostrar en pantalla Descripción, Obs/Unidad, Descripción de Rubro, Descripción de Categoría



**Sección Productos**

* Tarjetas/Panel de Rubros
* Al tocar un Rubro debe filtrar y mostrar las Categorías de ese rubro en tarjetas de dicho filtro y los productos de ese rubro, debe haber un indicador de navegación arriba de los productos.
* Al tocar una Categoria debe filtrar y mostrar los productos de ese rubro en tarjetas de dicho filtro, debe haber un indicador de navegación arriba de los productos.
* Al hacer clico en el producto se debe mostrar modal con Código, Descripción, Descripción de Rubro, Descripción de Categoría
* Si no hay filtro de Rubro/Categoría muestra todos
* Solo debe mostrar en pantalla Descripción, Obs/Unidad, Descripción de Rubro, Descripción de Categoría
* El usuario debe poder generar un pedido de presupuesto, seleccionado con un check box un producto e ingresando la cantidad deseada. Ese presupuesto va a generarse en el frontend armando una lista con los seleccionados en carrito de presupuesto. Para enviarlo se le solicitará a través de un formulario: Nombre, email, teléfono, dirección, box de mensaje y la lista de seleccionados, el email destino se proporcionará mas adelante. El formulario será enviado via FormSubmit con asunto "Pedido Presupuesto" con la propiedad endpoint AJAX, y los siguientes niveles de seguridad
Vamos a implementar políticas de seguridad en el formulario

&#x09;-Sanitización

&#x09;-Protección contra XSS

&#x09;-Cifrado SSL (HTTPS)

&#x09;-Límite de envíos (Rate Limiting)

&#x09;-el campo oculto "honeypot" que los bots caen en la trampa de rellenar,

&#x09;-los límites máximos de longitud en los campos del formulario para prevenir abuso de peticiones masivas



**Sección CTA 1**

* Imagen representativa paralax y CTA: Debe tener un texto que invite a Productores y Fabricantes de insumos y productos del rubro a una alianza estratégica con Depósito Bommbal a canalizar su distribución a través de la estructura logística propia que cuenta la empresa, debe tener un botón que acceda a un formulario de contacto con los campos: Nombre/Razón Social, email, teléfono, dirección, rubro, y box de mensaje, el email destino se proporcionará mas adelante. El formulario será enviado via FormSubmit asunto "Solicitud Logística"
* &#x20;con la propiedad endpoint AJAX, y los siguientes niveles de seguridad
Vamos a implementar políticas de seguridad en el formulario

&#x09;-Sanitización

&#x09;-Protección contra XSS

&#x09;-Cifrado SSL (HTTPS)

&#x09;-Límite de envíos (Rate Limiting)

&#x09;-el campo oculto "honeypot" que los bots caen en la trampa de rellenar,

&#x09;-los límites máximos de longitud en los campos del formulario para prevenir abuso de peticiones masivas



**Sección Populares**

* Tarjetero sección productos populares \[true] en modo carrusel 1 línea
* Al hacer click en el producto se debe mostrar modal con Código, Descripción, Categoría
* No mostrar precios aún



**Sección CTA 2**

* Formulario de contacto: Nombre, email, móvil, mensaje, el formulario será enviado via FormSubmit asunto "Consulta"
* con la propiedad endpoint AJAX

Vamos a implementar políticas de seguridad en el formulario

&#x09;-Sanitización

&#x09;-Protección contra XSS

&#x09;-Cifrado SSL (HTTPS)

&#x09;-Límite de envíos (Rate Limiting)

&#x09;-el campo oculto "honeypot" que los bots caen en la trampa de rellenar,

&#x09;-los límites máximos de longitud en los campos del formulario para prevenir abuso de peticiones masivas

* Botón Whatsapp con enlace a Whatsapp, Botón email con enlace, Botón dirección con enlace a Google Maps



**Sección footer**

* Terminos y Condiciones
* Privacidad
* Copyright
* Datos de contacto
* powered by Dédalo



\[todos los formularios FormSubmit deben dirigirse a la casilla de email indicada]







##### **Funcionalidad Administración**

* Se debe acceder \[url-sitio]/admin
* Login con email y contraseña
* Funcionalidad de "¿Olvidaste tu contraseña?" -> debe ingresar contraseña registrada y la BD debe enviar email con enlace para reactivar contraseña
* Modulo Altas y Modificaciones de Categorías \[Formulario]
* Modulo Altas y Modificaciones de Productos \[Formulario]
* El modo de acceder a la selección de imágenes de Categorías y Productos es: Elegir imagen local y/o arrastrar soltar (deberá tener validación de tamaño de imagen)
* Opción Cerrar sesión





##### **Diccionario de datos**

**Tabla Productos**

IDProducto \[STRING]

Descripción \[STRING]

Obs/Unidad\[STRING]

IDCategoria \[STRING] -> **Tabla Categoría** (muchos a 1)

Activo \[BYTE 0/1]

Precio \[NUMERIC]

Alícuota \[NUMERIC]

PrecioFinal \[NUMERIC]

FechaAlta \[DATE-TIME]

FechaActualizacion \[DATE-TIME]

IDUsuarioActualizacion \[NUMERIC] > **Tabla Usuarios** (muchos a 1)

Destacado \[BYTE 0/1]

Popular \[BYTE 0/1]

Imagen \[STRING] -> path del archivo imagen



**Tabla rubros**
IDRubro -> Tabla Categoría (1 a muchos)
Descripción

Activo \[BYTE 0/1]

Imagen \[STRING] -> path del archivo imagen



**Tabla Categoria**

IDCategoria \[STRING] -> **Tabla Productos** (1 a muchos)

ID Rubros -> Tabla Rubros (1 a muchos)

Descripción \[STRING]

Observaciones \[STRING]

Activo \[BYTE 0/1]

Imagen \[STRING] -> path del archivo imagen



**Tabla Usuarios**

IDUsuario \[NUMERIC] -> **Tabla Productos** (1 a muchos)
Nombre \[STRING]

Email \[STRING]

Rol \[STRING] (ADMIN/SADMIN)





Desarrollo:
Arquitectura: React/Vite

Base de datos: Firebase Firestore
Almacenamiento imágenes: Firebase Storage

Repositorio: GitHub

Deploy: Versel



Clonado de:
https://es.wix.com/website-template/view/html/2949?originUrl=https%3A%2F%2Fes.wix.com%2Fwebsite%2Ftemplates%2Fhtml%2Fonline-store%2F5\&tpClick=view\_button\&esi=7fae268c-702c-4e91-aaa0-e05ac833819a

