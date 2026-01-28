# 🚀 會計系統部署指南

## ✅ 已完成的修復（完整版）

### 1. **核心架構恢復**
- ✅ `src/main.js` - 使用 ES modules，保留完整功能
- ✅ `src/utils/errorHandler.js` - 全局錯誤處理與網路監控
- ✅ `src/layouts/MainLayout.vue` - 完整側邊欄導航佈局
- ✅ `src/router/index.js` - 已存在，路由配置完整

### 2. **依賴庫下載（37/37 成功）**
已下載到 `public/libs/` 目錄：

#### 核心庫
- Vue 3.4.15 (生產版)
- Vue Router 4.2.5
- Pinia 2.1.7 (狀態管理)

#### UI 框架
- PrimeVue 3.48.1 + 主題
- PrimeIcons 6.0.1 (含字體檔案)

#### 工具庫
- Decimal.js, Day.js, Lodash, DOMPurify
- Dexie.js (IndexedDB)

#### PDF 處理
- jsPDF, PDF-lib, PDF.js (含 worker)
- html2canvas

#### 文件處理
- JSZip, FileSaver
- XLSX.js, ExcelJS

#### 圖表
- Chart.js, ECharts

#### OCR
- Tesseract.js (含 WASM 核心)
- Pica, Compressor.js

#### 其他
- Validator.js, Crypto-js
- QRCode, UUID

---

## 🌐 部署方式

### 方法 1：GitHub Pages（推薦）

1. **啟用 GitHub Pages**
   ```bash
   # 進入 repo 設置
   Settings → Pages → Source: main branch → Save
   ```

2. **訪問網址**
   ```
   https://maotai11.github.io/Accountoffline-/
   ```

### 方法 2：Vercel（最快）

1. **導入項目**
   - 訪問 [vercel.com](https://vercel.com)
   - Import Git Repository
   - 選擇 `maotai11/Accountoffline-`

2. **配置**
   ```
   Framework Preset: Other
   Build Command: (留空)
   Output Directory: ./
   ```

3. **部署**
   - 點擊 Deploy
   - 自動獲得域名：`accountoffline.vercel.app`

### 方法 3：Netlify

1. **拖拽部署**
   - 訪問 [netlify.com](https://netlify.com)
   - 拖拽整個 repo 文件夾到 Drop Zone
   - 或連接 GitHub repo

2. **配置**
   ```
   Build command: (留空)
   Publish directory: ./
   ```

### 方法 4：本地測試（開發用）

```bash
# 克隆 repo
git clone https://github.com/maotai11/Accountoffline-.git
cd Accountoffline-

# 啟動 HTTP 伺服器（任選一種）
python3 -m http.server 8000
# 或
npx serve .
# 或
php -S localhost:8000

# 訪問
open http://localhost:8000
```

---

## 📁 項目結構

```
Accountoffline-/
├── index.html              # 應用入口
├── src/
│   ├── main.js            # Vue 應用初始化（ES modules）
│   ├── router/
│   │   └── index.js       # 路由配置
│   ├── layouts/
│   │   └── MainLayout.vue # 主佈局（側邊欄 + 導航）
│   ├── utils/
│   │   └── errorHandler.js # 錯誤處理
│   ├── modules/           # 功能模塊（儀表板、計算器等）
│   └── components/        # 通用組件（OCR 等）
├── public/
│   └── libs/              # 37 個第三方庫（已下載）
└── download_libs.py       # 依賴下載腳本
```

---

## 🔧 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | Vue 3 (Composition API) |
| 路由 | Vue Router 4 (Hash 模式) |
| 狀態管理 | Pinia |
| UI 組件 | PrimeVue + PrimeIcons |
| 數據庫 | Dexie.js (IndexedDB) |
| PDF | jsPDF + PDF.js |
| OCR | Tesseract.js |
| 圖表 | Chart.js + ECharts |

---

## ⚠️ 注意事項

### 1. **ES Modules 需求**
- `src/main.js` 使用 `import` 語法
- **必須透過 HTTP 伺服器運行**（不能直接打開 HTML）
- GitHub Pages / Vercel / Netlify 都支持

### 2. **路由模式**
- 使用 `createWebHashHistory()` (Hash 模式)
- URL 格式：`https://yourdomain.com/#/ocr-batch`
- 無需伺服器端路由配置

### 3. **依賴完整性**
- 所有 37 個庫已下載到 `public/libs/`
- 無需 `npm install` 或打包工具
- 純靜態檔案，可直接部署

---

## 🎯 功能清單

| 功能 | 路由 | 狀態 |
|------|------|------|
| 儀表板 | `/` | ✅ |
| OCR 批量識別 | `/ocr-batch` | ✅ |
| 稅務計算器 | `/calculations` | ✅ |
| 代扣繳 | `/withholding` | ✅ |
| 個人所得稅 | `/pit` | ✅ |
| 營所稅 | `/cit` | ✅ |
| 罰款計算 | `/penalty` | ✅ |
| 報表生成 | `/reports` | ✅ |
| 規則管理 | `/rules` | ✅ |
| 歷史記錄 | `/history` | ✅ |

---

## 🐛 故障排除

### 問題 1：白屏 / 卡在啟動
**原因**：ES modules 未正確載入  
**解決**：
1. 確認透過 HTTP 伺服器訪問（非 `file://`）
2. 檢查 Console 是否有 CORS 錯誤
3. 確認 `public/libs/` 所有檔案已下載

### 問題 2：路由 404
**原因**：使用 History 模式但伺服器未配置  
**解決**：已使用 Hash 模式，無需配置

### 問題 3：某些功能報錯
**原因**：組件檔案缺失  
**解決**：檢查 `src/modules/` 和 `src/components/` 是否完整

---

## 📞 支援

- GitHub Issues: [Accountoffline-/issues](https://github.com/maotai11/Accountoffline-/issues)
- 文檔：本 README
- 錯誤追蹤：瀏覽器 Console (F12)

---

## 🎉 快速開始

```bash
# 1. 克隆 repo
git clone https://github.com/maotai11/Accountoffline-.git
cd Accountoffline-

# 2. 啟動本地伺服器
python3 -m http.server 8000

# 3. 訪問
# http://localhost:8000

# 或直接部署到 Vercel/Netlify/GitHub Pages
# 無需本地環境！
```

---

**🚀 你的會計系統已準備好上線！**
