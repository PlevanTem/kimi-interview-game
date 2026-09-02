import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js is the single runtime engine; its 300 kB gzip output is within the
    // framework transfer budget even though the uncompressed chunk exceeds 500 kB.
    chunkSizeWarningLimit: 1100,
  },
})
