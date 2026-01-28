// Invoice OCR 專用入口
import { createApp } from 'vue'
import BatchOCRProcessor from '../../src/components/ocr/BatchOCRProcessor.vue'

// 引入共用模組
import '../../shared/storage/database.js'

const app = createApp({
  components: {
    BatchOCRProcessor
  },
  template: `
    <div class="invoice-app">
      <header>
        <h1>📸 發票 OCR 掃描</h1>
        <a href="/">← 返回首頁</a>
      </header>
      <BatchOCRProcessor />
    </div>
  `
})

app.mount('#app')
