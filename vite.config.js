import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 多 entry point 配置
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        invoice: resolve(__dirname, 'invoice/index.html'),
        record: resolve(__dirname, 'record/index.html'),
      },
    },
  },

  // 優化配置
  optimizeDeps: {
    exclude: ['paddle-ocr-wasm'], // OCR Wasm 按需載入
  },

  // 確保 Wasm 正確載入
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    fs: {
      strict: false,
    },
  },

  // 確保靜態資源正確處理
  assetsInclude: ['**/*.wasm'],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './shared'),
    },
  },
})
