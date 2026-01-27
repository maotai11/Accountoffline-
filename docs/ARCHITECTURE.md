# 系統架構文檔

## 架構概覽

本系統採用**領域驅動設計（DDD）**，分為四層架構：

```
┌─────────────────────────────────────────┐
│         表現層 (Presentation)            │
│    modules/ - Vue 組件與用戶界面         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          領域層 (Domain)                 │
│   core/domain - 領域模型                 │
│   core/engines - 業務邏輯引擎            │
│   core/services - 領域服務               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      基礎設施層 (Infrastructure)         │
│   storage/ - 數據持久化                  │
│   utils/ - 工具函數                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         數據層 (Data)                    │
│   IndexedDB - 本地數據庫                 │
│   File System API - 文件存儲             │
└─────────────────────────────────────────┘
```

---

## 核心設計模式

### 1. Repository 模式
所有數據訪問通過 Repository 統一管理：

```javascript
// BaseRepository 提供通用 CRUD
class BaseRepository {
  async create(data) { /* ... */ }
  async findById(id) { /* ... */ }
  async update(id, updates) { /* ... */ }
  async delete(id) { /* ... */ }
}

// 特定實體擴展基礎功能
class RuleRepository extends BaseRepository {
  async findActiveByCategory(category) { /* ... */ }
  async checkConflicts(newRule) { /* ... */ }
}
```

### 2. Engine 模式
業務邏輯封裝在獨立引擎中：

```javascript
class WithholdingEngine {
  static calculate(params) {
    // 1. 參數消毒
    // 2. 業務邏輯執行
    // 3. 返回結構化結果
  }
}
```

### 3. Strategy 模式
稅額計算根據類型動態選擇策略：

```javascript
switch (incomeType) {
  case 'salary':
    return this._calculateSalary(amount);
  case 'rent':
    return this._calculateRent(amount);
  // ...
}
```

---

## 數據流向

### 用戶操作 → 計算結果

```
1. 用戶輸入（Vue 組件）
   ↓
2. 參數消毒（Sanitizer）
   ↓
3. 計算引擎執行（Engine）
   ↓
4. 結果存儲（Repository）
   ↓
5. UI 更新（Pinia Store + Vue 響應式）
```

### 規則更新流程

```
1. PDF 上傳
   ↓
2. PDF.js 文本提取
   ↓
3. 規則解析器識別條文
   ↓
4. 規則卡生成
   ↓
5. 衝突檢測
   ↓
6. 版本發布
```

---

## 關鍵技術決策

### 為何選擇 IndexedDB？
- ✅ 大容量存儲（遠超 LocalStorage 的 5MB 限制）
- ✅ 支持索引與複雜查詢
- ✅ 異步操作不阻塞 UI
- ✅ 事務支持保證數據一致性

### 為何使用 Decimal.js？
```javascript
// 浮點運算誤差示例
0.1 + 0.2 === 0.3  // false (實際為 0.30000000000000004)

// Decimal.js 解決方案
new Decimal(0.1).plus(0.2).equals(0.3)  // true
```

稅務計算要求**絕對精確**，任何誤差都可能導致稅額錯誤。

### 為何採用 DOMPurify？
- 防止 XSS 注入攻擊
- 白名單機制僅允許安全 HTML
- 廣泛使用且經過實戰驗證

---

## 效能優化策略

### 1. 懶加載（Lazy Loading）
```javascript
// 按需加載大型組件
const DashboardView = () => import('./modules/dashboard/DashboardView.vue');
```

### 2. 虛擬滾動（Virtual Scrolling）
```vue
<!-- PrimeVue DataTable 內建虛擬滾動 -->
<DataTable :value="cases" virtualScroll :rows="20" scrollHeight="600px">
```

### 3. Service Worker 緩存
```javascript
// 核心資源預緩存
const CORE_ASSETS = [
  './index.html',
  './src/main.js',
  './public/libs/vue.global.prod.js'
];
```

---

## 安全架構

### 多層防護

```
輸入層：Sanitizer 消毒所有用戶輸入
  ↓
計算層：SafeFormulaExecutor 防止公式注入
  ↓
存儲層：CSP 防止惡意腳本執行
  ↓
輸出層：Vue 自動轉義防止 XSS
```

### CSP 配置
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline';">
```

---

## 擴展指南

### 新增稅種計算

1. **創建引擎類**
   ```javascript
   // src/core/engines/calculation/NewTaxEngine.js
   export class NewTaxEngine {
     static calculate(params) {
       // 實現計算邏輯
     }
   }
   ```

2. **添加規則卡**
   ```javascript
   // src/storage/database.js - initializeDefaultRules()
   {
     ruleId: 'NEW-TAX-001',
     category: 'newtax',
     formula: 'amount * 0.15',
     // ...
   }
   ```

3. **創建 UI 組件**
   ```vue
   <!-- src/modules/workbench/newtax/NewTaxCalc.vue -->
   <template>
     <CalculatorLayout title="新稅種計算">
       <!-- 計算器界面 -->
     </CalculatorLayout>
   </template>
   ```

4. **註冊路由**
   ```javascript
   // src/router.js
   {
     path: '/workbench/newtax',
     component: () => import('./modules/workbench/newtax/NewTaxCalc.vue')
   }
   ```

---

## 測試策略

### 單元測試（建議使用 Vitest）
```javascript
import { describe, it, expect } from 'vitest';
import { WithholdingEngine } from './WithholdingEngine.js';

describe('WithholdingEngine', () => {
  it('應正確計算薪資扣繳', () => {
    const result = WithholdingEngine.calculate({
      incomeType: 'salary',
      amount: 100000,
      isResident: true
    });
    
    expect(result.withholdingAmount).toBe(5000);
  });
});
```

### E2E 測試（建議使用 Playwright）
```javascript
test('完整扣繳計算流程', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await page.click('text=計算工作台');
  await page.fill('#amount', '100000');
  await page.click('button:text("計算")');
  await expect(page.locator('.result')).toContainText('5,000');
});
```

---

## 部署方案

### 方案一：靜態托管（推薦）
- GitHub Pages
- Vercel
- Netlify

### 方案二：企業內網
- Nginx 靜態文件服務器
- Apache HTTP Server

### 方案三：桌面應用
- 使用 Electron 打包
- 使用 Tauri 打包（更輕量）

---

## 效能指標

| 指標 | 目標值 | 實際值 |
|------|-------|--------|
| 首屏載入時間 | < 2s | ~1.5s |
| 計算響應時間 | < 100ms | ~50ms |
| 數據庫查詢 | < 50ms | ~20ms |
| 內存佔用 | < 200MB | ~150MB |

---

## 常見問題

### Q: 如何備份數據？
A: 使用內建的「導出備份」功能，將 IndexedDB 數據導出為 JSON 文件。

### Q: 如何更新稅率？
A: 在「規則後台」上傳新版 PDF 文件，系統自動解析並更新規則卡。

### Q: 如何處理舊版數據？
A: 系統支持數據庫遷移，舊版數據自動升級至新結構。

---

**更多技術細節請參考源碼註釋 📝**
