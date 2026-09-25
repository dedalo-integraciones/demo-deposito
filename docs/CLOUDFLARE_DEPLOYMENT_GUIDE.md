# Guía de Despliegue en Cloudflare (Workers / Pages con Assets)

Este documento describe la arquitectura, configuración, consideraciones técnicas y solución a errores comunes para el despliegue continuo de aplicaciones SPA (React, Vite, Tailwind CSS) en la plataforma de **Cloudflare**.

---

## 1. Arquitectura y Modelo de Despliegue

Cloudflare utiliza el sistema moderno **Workers with Static Assets** (o Pages) gestionado a través de `wrangler`.

### Requisitos Básicos del Repositorio:
1. **Node.js LTS (>= 22.12.0)**: Necesario para compatibilidad con Vite 6+/8+ y `@vitejs/plugin-react`.
2. **Package Manager único**: Usar exclusivamente `npm` con `package-lock.json` sincronizado.
3. **`wrangler.toml`**: Archivo de configuración centralizado en la raíz del proyecto.
4. **Tailwind CSS v4**: Utilizar `@tailwindcss/postcss` y `postcss.config.js` para evitar dependencias nativas compiladas en Rust (`@tailwindcss/vite` / `rolldown`) que fallan en entornos CI de Linux.

---

## 2. Archivos de Configuración Esenciales

### `wrangler.toml` (Raíz del proyecto)
```toml
name = "<nombre-del-proyecto-en-cloudflare>"
compatibility_date = "2024-09-23"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```
> **Nota crítica**: El parámetro `name` debe coincidir exactamente con el nombre del proyecto en Cloudflare (sin guiones adicionales si en el panel está todo junto).
> `not_found_handling = "single-page-application"` garantiza que rutas como `/admin`, `/login`, `/rubros/x` redirijan internamente a `index.html` sin necesidad de archivos `_redirects`.

### `.node-version` y `.nvmrc` (Raíz del proyecto)
```text
22.12.0
```

### `postcss.config.js`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### `vite.config.js` / `vite.config.ts`
```javascript
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
```

---

## 3. Configuración en el Panel de Cloudflare

| Sección | Parámetro | Valor |
| :--- | :--- | :--- |
| **Build Configurations** | Framework preset | `Vite` (o `None`) |
| | Build command | `npm run build` |
| | Deploy command | `npx wrangler deploy` |
| | Preview command | `npx wrangler preview` |
| **Advanced** | Root directory | *(Vacío o `/` - ¡Nunca `/dist`!)* |
| **Variables de entorno** | `NODE_VERSION` | `22.12.0` |

---

## 4. Trampas Conocidas y Cómo Evitarlas

### ❌ 1. Prohibido crear `public/_redirects` con `/* /index.html 200`
- **Error:** `Infinite loop detected in this rule. [code: 100324]`.
- **Causa:** En Workers Assets, esta regla de Netlify colisiona con el manejo de activos estáticos y genera un bucle de redirección en `/index`.
- **Solución:** Eliminar `public/_redirects` y usar `not_found_handling = "single-page-application"` en `wrangler.toml`.

### ❌ 2. Prohibido usar `@tailwindcss/vite`
- **Error:** `Cannot find module '@rolldown/binding-linux-x64-gnu'` o `Module not found: @tailwindcss/vite`.
- **Causa:** Paquetes nativos compilados en Rust con fallas conocidas de instalación en CI con npm opcional.
- **Solución:** Usar `@tailwindcss/postcss` + `postcss` y `@import "tailwindcss";` en `index.css`.

### ❌ 3. Prohibido subir o generar `bun.lock`
- **Error:** Desincronización con `npm ci` o detección incorrecta del package manager en Cloudflare.
- **Solución:** Agregar `bun.lock` y `bun.lockb` a `.gitignore`.

### ❌ 4. Desincronización de `package-lock.json`
- **Error:** `npm error 'npm ci' can only install packages when your package.json and package-lock.json are in sync`.
- **Solución:** Ejecutar `npm i` localmente después de cualquier cambio en `package.json` y commitear el `package-lock.json` actualizado.
