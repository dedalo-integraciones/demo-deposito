import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './lib/firebase.js'

// Actualizar dinámicamente metadatos de Open Graph y Canonical según el dominio real de despliegue (Vercel, AI Studio o dominio propio)
if (typeof window !== 'undefined') {
  try {
    const origin = window.location.origin
    const absoluteOgImage = `${origin}/og-image.jpg`
    const ogImageEl = document.querySelector('meta[property="og:image"]')
    const ogImageSecureEl = document.querySelector('meta[property="og:image:secure_url"]')
    const twitterImageEl = document.querySelector('meta[name="twitter:image"]')
    const ogUrlEl = document.querySelector('meta[property="og:url"]')

    if (ogImageEl) ogImageEl.setAttribute('content', absoluteOgImage)
    if (ogImageSecureEl) ogImageSecureEl.setAttribute('content', absoluteOgImage)
    if (twitterImageEl) twitterImageEl.setAttribute('content', absoluteOgImage)
    if (ogUrlEl) ogUrlEl.setAttribute('content', origin)
  } catch (e) {
    console.debug('Meta tags update error:', e)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)