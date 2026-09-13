import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7269', // .NET API port
        changeOrigin: true,
        secure: false, // dev HTTPS certificate is self-signed
      },
    },
  },
})