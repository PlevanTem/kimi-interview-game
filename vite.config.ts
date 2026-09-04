import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // three.js 是唯一的运行时引擎，其未压缩包体超过 500 kB 但 gzip 后仍在预算内。
    chunkSizeWarningLimit: 1200,
  },
})
