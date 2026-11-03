import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // three.js is large by nature; it's lazy-loaded separately from the page content
  build: { chunkSizeWarningLimit: 1000 },
})
