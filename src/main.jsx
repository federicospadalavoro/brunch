import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Set favicon (respect Vite base URL)
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.href = import.meta.env.BASE_URL + 'icon.png'
favicon.type = 'image/png'
document.head.appendChild(favicon)

// Update meta theme-color to follow system light/dark preference (helps PWA status bar on iOS)
const updateThemeColor = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) metaTheme.setAttribute('content', isDark ? '#1a1a1a' : '#ffffff')
}

updateThemeColor()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
