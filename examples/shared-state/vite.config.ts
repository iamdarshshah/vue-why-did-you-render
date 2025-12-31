import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Point directly to the built dist
      'vue-why-did-you-render': path.resolve(__dirname, '../../dist/index.js')
    },
    dedupe: ['vue']
  },
  optimizeDeps: {
    exclude: ['vue-why-did-you-render']
  }
})

