import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['chrome87', 'edge87', 'firefox78', 'safari14'],
  },
})
