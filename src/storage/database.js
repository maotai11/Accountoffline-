/**
 * Dexie.js 數據庫配置
 * 會計事務所內控作業系統 - 數據持久化層
 */

import Dexie from '../public/libs/dexie.min.js';

// 數據庫版本
const DB_VERSION = 1;
const DB_NAME = 'AccountingOS';

// 創建數據庫實例
export const db = new Dexie(DB_NAME);

// 定義數據表結構
db.version(DB_VERSION).stores({
  // 客戶表
  clients: '++id, &taxId, name, createdAt, updatedAt',
  
  // 案件表
  cases: '++id, clientId, year, type, status, createdAt, updatedAt',
  
  // 規則卡表
  rules: '++id, &ruleId, category, version, effectiveDate, isActive',
  
  // 計算結果表
  calculations: '++id, caseId, type, calculatedAt, [caseId+type]',
  
  // 審計日誌表
  auditLogs: '++id, entityType, entityId, action, timestamp',
  
  // 文件元數據表（實際文件存於 File System API）
  fileMetadata: '++id, caseId, fileName, fileType, uploadedAt',
  
  // 系統配置表
  settings: '&key, value, updatedAt'
});

// 數據庫打開錯誤處理
db.on('populate', () => {
  console.log('📊 數據庫首次創建，初始化預設規則...');
  initializeDefaultRules();
});

db.on('ready', () => {
  console.log('✅ 數據庫就緒');
});

db.open().catch((err) => {
  console.error('❌ 數據庫打開失敗:', err);
});

/**
 * 初始化預設規則卡
 */
async function initializeDefaultRules() {
  const defaultRules = [
    // 扣繳規則
    {
      ruleId: 'WITHHOLDING-SALARY-RESIDENT',
      category: 'withholding',
      name: '薪資所得扣繳（本國居民）',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'amount >= 88501 ? amount * 0.05 : 0',
      conditions: {
        incomeType: 'salary',
        isResident: true
      },
      legalBasis: '所得稅法第88條、各類所得扣繳率標準',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      ruleId: 'WITHHOLDING-RENT-RESIDENT',
      category: 'withholding',
      name: '租金所得扣繳（本國居民）',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'amount * 0.10',
      conditions: {
        incomeType: 'rent',
        isResident: true
      },
      legalBasis: '所得稅法第88條',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    
    // 二代健保規則
    {
      ruleId: 'NHI2-BONUS',
      category: 'nhi2',
      name: '高額獎金補充保費',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'Math.min((bonus - insuredSalary * 4) * 0.0211, 10000000 * 0.0211)',
      conditions: {
        incomeType: 'bonus',
        threshold: 'insuredSalary * 4'
      },
      legalBasis: '全民健康保險法第31條',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      ruleId: 'NHI2-PARTTIME',
      category: 'nhi2',
      name: '兼職收入補充保費',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'amount >= 28590 ? Math.min(amount * 0.0211, 10000000 * 0.0211) : 0',
      conditions: {
        incomeType: 'parttime',
        threshold: 28590
      },
      legalBasis: '全民健康保險法第31條',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    
    // 綜所稅規則
    {
      ruleId: 'PIT-TAX-BRACKET-1',
      category: 'pit',
      name: '綜所稅第1級距',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'taxableIncome * 0.05',
      conditions: {
        minIncome: 0,
        maxIncome: 610000
      },
      legalBasis: '所得稅法第5條',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    
    // 營所稅規則
    {
      ruleId: 'CIT-STANDARD-RATE',
      category: 'cit',
      name: '營所稅標準稅率',
      version: '2025.1',
      effectiveDate: '2025-01-01',
      formula: 'taxableIncome * 0.20',
      conditions: {
        entityType: 'company'
      },
      legalBasis: '所得稅法第5條',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];
  
  await db.rules.bulkAdd(defaultRules);
  console.log(`✅ 已初始化 ${defaultRules.length} 條預設規則`);
}

export default db;
