import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // base necessario per GitHub Pages (nome repo)
  base: '/brunch/',
  plugins: [react()],
})
