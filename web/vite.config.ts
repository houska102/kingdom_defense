import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import canvasengine from '@canvasengine/compiler'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), canvasengine()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [fileURLToPath(new URL('./src/styles', import.meta.url))],
      },
    },
  },
})
