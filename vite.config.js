import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    port: 8080,
    host: true,
    allowedHosts: ['memehub92i.up.railway.app'],
  },
})
