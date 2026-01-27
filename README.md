# 會計事務所內控作業系統

> 離線稅務計算與案件管理系統 | Offline Accounting Internal Control Operating System

## 🎯 專案概述

本系統是一個**完全離線運行**的企業級會計內控應用，專為台灣會計事務所設計，實現「規則驅動 + 審計閉環 + 數據安全」的核心目標。

### 核心特性

✅ **完全離線** - 無需網絡連接，所有運算本地完成  
✅ **精確計算** - 使用 Decimal.js 確保金額計算零誤差  
✅ **規則驅動** - PDF 規則解析 + 版本控制 + 衝突檢測  
✅ **數據安全** - IndexedDB 本地存儲 + XSS 防護 + 備份導出  
✅ **審計追蹤** - 完整操作日誌 + 跨模組一致性檢查  
✅ **五大模組** - 儀表板 / 案件管理 / 計算工作台 / 規則後台 / 助手

---

## 🏗️ 系統架構

```
表現層（modules/）
  ↓
領域層（core/domain + engines/）
  ↓
基礎設施層（storage/ + file-system/）
```

### 技術棧

| 類別 | 技術選型 | 版本 |
|------|---------|------|
| **框架** | Vue 3 + Composition API | 3.4.15 |
| **狀態管理** | Pinia | 2.1.7 |
| **路由** | Vue Router | 4.2.5 |
| **UI 組件** | PrimeVue | 3.48.1 |
| **數據庫** | Dexie.js (IndexedDB) | 3.2.4 |
| **精確計算** | Decimal.js | 10.4.3 |
| **PDF 處理** | PDF.js | 3.11.174 |
| **圖表** | Apache ECharts | 5.4.3 |
| **XSS 防護** | DOMPurify | 3.0.8 |

---

## 📦 快速開始

### 1. 克隆倉庫
```bash
git clone https://github.com/maotai11/Accountoffline-.git
cd Accountoffline-
```

### 2. 下載第三方庫
```bash
python3 download_libs.py
```

### 3. 運行應用

**方式一：直接打開**
```bash
# 使用瀏覽器打開
open index.html
```

**方式二：本地服務器（推薦）**
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# 訪問 http://localhost:8000
```

---

## 📚 功能模組

### 🎛️ 主頁儀表板
- 案件進度全局視圖
- 風險雷達圖（逾期/待審/異常）
- 待辦事項追蹤
- 快捷操作入口

### 💼 客戶與案件管理
- 客戶資料 CRUD
- 案件生命週期管理（新建 → 處理中 → 已完成）
- 文件關聯與版本追蹤
- 案件時間軸展示

### 🧮 計算工作台

#### 扣繳稅額計算
- 9 類所得類別（薪資/租金/佣金/權利金/獎金/執行業務/退職/利息/股利）
- 居民/非居民身份自動判定
- 即時顯示計算步驟與法條依據

#### 二代健保補充保費
- 高額獎金（超過投保薪資 4 倍）
- 兼職收入（≥ 基本工資 28,590）
- 執行業務/股利/利息/租金（≥ 20,000）
- 費率 2.11%，上限 1000 萬

#### 綜合所得稅
- 5 級累進稅率（5%/12%/20%/30%/40%）
- 免稅額與扣除額自動計算
- 股利二擇一優化（合併 vs 分開 28%）
- 海外所得基本稅額（AMT）

#### 營利事業所得稅
- 標準稅率 20%
- 虧損扣抵（10 年追溯）
- 未分配盈餘稅 5%
- 基本稅額 12%/15%（GMT）

### 📋 規則後台
- PDF 上傳與文本提取
- 規則自動解析（條文 + 稅率 + 門檻）
- 版本控制與發布
- 衝突檢測與解決

---

## 🛡️ 安全機制

### XSS 防護
```javascript
// 所有用戶輸入經過消毒
import { Sanitizer } from './utils/sanitizer.js';

const cleanInput = Sanitizer.escapeHTML(userInput);
const cleanNumber = Sanitizer.sanitizeNumber(amount);
```

### CSP（內容安全策略）
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-eval';">
```

### 數據加密（可選）
- 支持 AES-256 客戶端加密
- 加密金鑰僅存於本地

---

## 📊 計算引擎範例

### 扣繳稅額計算
```javascript
import { WithholdingEngine } from './core/engines/calculation/WithholdingEngine.js';

const result = WithholdingEngine.calculate({
  incomeType: 'salary',
  amount: 100000,
  isResident: true
});

console.log(result);
// {
//   success: true,
//   withholdingAmount: 5000,  // 100,000 × 5%
//   netPayment: 95000,
//   rate: 0.05,
//   applicableRule: '月薪 ≥ 88,501 元，扣繳 5%',
//   legalBasis: '所得稅法第88條'
// }
```

### 二代健保補充保費
```javascript
import { NHI2Engine } from './core/engines/calculation/NHI2Engine.js';

const result = NHI2Engine.calculate({
  incomeType: 'bonus',
  amount: 200000,
  insuredSalary: 40000
});

console.log(result);
// {
//   success: true,
//   premium: 844,  // (200,000 - 40,000×4) × 2.11%
//   premiumBase: 40000,
//   threshold: 160000,
//   rate: 0.0211
// }
```

---

## 🗂️ 數據結構

### 客戶（Client）
```typescript
interface Client {
  id: number;
  taxId: string;           // 統一編號
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}
```

### 案件（Case）
```typescript
interface Case {
  id: number;
  clientId: number;
  year: number;
  type: 'withholding' | 'nhi2' | 'pit' | 'cit';
  status: 'pending' | 'in_progress' | 'completed';
  calculationResults: object;
  createdAt: string;
  updatedAt: string;
}
```

### 規則卡（RuleCard）
```typescript
interface RuleCard {
  id: number;
  ruleId: string;
  category: string;
  name: string;
  version: string;
  effectiveDate: string;
  formula: string;
  conditions: object;
  legalBasis: string;
  isActive: boolean;
}
```

---

## 🔧 開發指南

### 新增計算規則
1. 在 `src/core/engines/calculation/` 創建引擎類
2. 實現 `calculate(params)` 方法
3. 在 `src/storage/database.js` 添加預設規則卡
4. 更新 UI 組件引用

### 新增模組
1. 在 `src/modules/` 創建模組目錄
2. 實現 Vue 組件
3. 在 `src/router.js` 註冊路由
4. 在主導航添加入口

---

## 📖 法規依據

| 稅目 | 主要法源 | 更新日期 |
|------|---------|---------|
| 扣繳稅額 | 所得稅法第88條、各類所得扣繳率標準 | 2025-01-01 |
| 二代健保 | 全民健康保險法第31條 | 2021-01-01 |
| 綜所稅 | 所得稅法第5條、第17條 | 2025-01-01 |
| 營所稅 | 所得稅法第5條、第66條 | 2025-01-01 |

---

## 🤝 貢獻指南

1. Fork 本倉庫
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📝 授權協議

本專案採用 MIT 授權協議 - 詳見 [LICENSE](LICENSE) 文件

---

## 📞 聯繫方式

- **專案維護者**: Nebula AI
- **GitHub**: https://github.com/maotai11/Accountoffline-
- **問題回報**: [GitHub Issues](https://github.com/maotai11/Accountoffline-/issues)

---

## 🙏 致謝

感謝以下開源項目：
- Vue.js Team
- PrimeVue Team
- Dexie.js Contributors
- PDF.js Mozilla Team
- Apache ECharts Team

---

**祝您使用愉快！有問題隨時回來找我調整升級 🚀**
