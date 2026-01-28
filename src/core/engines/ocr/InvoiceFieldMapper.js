/**
 * 發票欄位同義詞映射引擎 - 強化版
 * 
 * 核心功能：
 * - 智能欄位識別：處理不同發票格式的欄位名稱差異
 * - 同義詞橋樑：建立欄位名稱的映射關係
 * - 模糊匹配：處理 OCR 錯字、異體字、簡繁混雜
 * - 自適應學習：記錄用戶修正，持續優化映射規則
 * - 三類發票自動拆分：總計 ÷ 1.05 = 未稅，未稅 × 0.05 = 稅額
 * - 金額驗證：檢查未稅 + 稅額 = 總計（容許 ±1 元誤差）
 * 
 * 欄位標準化：
 * ┌─────────────┬──────────────────────────────────────┐
 * │ 標準欄位名   │ 常見同義詞（含錯字、異體字）            │
 * ├─────────────┼──────────────────────────────────────┤
 * │ invoiceNo   │ 發票號碼、字軌號、統一發票號碼         │
 * │ date        │ 日期、開立日期、發票日期、民國日期     │
 * │ taxId       │ 統編、買方統編、統一編號、買受人統編   │
 * │ seller      │ 賣方、賣方名稱、銷售者、開立人         │
 * │ buyer       │ 買方、買方名稱、買受人、公司名稱       │
 * │ subtotal    │ 未稅金額、銷售額、小計、合計、不含稅   │
 * │ taxAmount   │ 稅額、營業稅、稅金、加值稅             │
 * │ total       │ 總計、總額、含稅總額、應收金額、實付   │
 * │ items       │ 品名、項目、品項、商品名稱、說明       │
 * └─────────────┴──────────────────────────────────────┘
 * 
 * @version 2.0.0 - 新增三類發票自動拆分
 * @author 會計事務所內控作業系統
 */

class InvoiceFieldMapper {
    constructor() {
        // 標準欄位定義（固定不變）
        this.standardFields = {
            invoiceNo: { required: true, type: 'string', validate: this.validateInvoiceNo },
            date: { required: true, type: 'date', validate: this.validateDate },
            taxId: { required: true, type: 'string', validate: this.validateTaxId },
            seller: { required: false, type: 'string' },
            buyer: { required: false, type: 'string' },
            subtotal: { required: false, type: 'number', validate: this.validateAmount },
            taxAmount: { required: false, type: 'number', validate: this.validateAmount },
            total: { required: true, type: 'number', validate: this.validateAmount },
            items: { required: false, type: 'array' }
        };
        
        // 同義詞字典（可擴展）
        this.synonymDictionary = {
            // 發票號碼同義詞
            invoiceNo: [
                '發票號碼', '字軌號', '統一發票號碼', '發票字軌',
                '發票編號', '票號', '單號', '憑證號碼',
                '發票號', '票據號碼', '發票字號',
                // 常見錯字
                '發要號碼', '發標號碼', '字執號', '字軌虎'
            ],
            
            // 日期同義詞
            date: [
                '日期', '開立日期', '發票日期', '開票日期',
                '年月日', '民國日期', '西元日期', '銷售日期',
                '交易日期', '製單日期', '開具日期',
                // 常見錯字
                '曰期', '日朗', '開乙日期'
            ],
            
            // 統一編號同義詞
            taxId: [
                '統編', '買方統編', '統一編號', '買受人統編',
                '營利事業統一編號', '公司統編', '稅籍編號',
                '買方統一編號', '買受人統一編號', '稅號',
                // 常見錯字
                '統緝', '統蝙', '買方鈕編', '統一編虎'
            ],
            
            // 賣方名稱同義詞
            seller: [
                '賣方', '賣方名稱', '銷售者', '開立人',
                '賣方公司', '供應商', '廠商名稱', '銷貨方',
                '賣家', '商家名稱', '營業人名稱',
                // 常見錯字
                '賈方', '貝方', '買方名稻'
            ],
            
            // 買方名稱同義詞
            buyer: [
                '買方', '買方名稱', '買受人', '公司名稱',
                '買方公司', '客戶名稱', '購買方', '進貨方',
                '買家', '顧客名稱', '戶名',
                // 常見錯字
                '賈方', '買芳', '買方各稻'
            ],
            
            // 未稅金額同義詞
            subtotal: [
                '未稅金額', '銷售額', '小計', '合計', '不含稅',
                '稅前金額', '應稅銷售額', '銷貨額', '淨額',
                '原價', '底價', '課稅銷售額', '不含稅金額',
                // 常見錯字
                '未税金额', '消售额', '不含稅金煩', '小计'
            ],
            
            // 稅額同義詞
            taxAmount: [
                '稅額', '營業稅', '稅金', '加值稅',
                '稅款', '應納稅額', '銷項稅額', 'VAT',
                '5% 稅額', '營業稅額', '稅費',
                // 常見錯字
                '税额', '稅顯', '營業說', '税金'
            ],
            
            // 總計同義詞
            total: [
                '總計', '總額', '含稅總額', '應收金額', '實付',
                '合計金額', '應付金額', '總價', '總金額',
                '含稅金額', '實際金額', '付款金額', '結算金額',
                // 常見錯字
                '综计', '總汁', '合計金煩', '实付'
            ],
            
            // 品項同義詞
            items: [
                '品名', '項目', '品項', '商品名稱', '說明',
                '貨品名稱', '服務項目', '內容', '品目',
                '商品', '貨物', '項次', '明細',
                // 常見錯字
                '品各', '項曰', '商品名稻'
            ]
        };
        
        // 模糊匹配配置
        this.fuzzyConfig = {
            minSimilarity: 0.7,        // 最低相似度閾值（70%）
            maxEditDistance: 2,        // 最大編輯距離
            enablePhonetic: true,      // 啟用注音/拼音模糊匹配
            enableVariants: true       // 啟用異體字匹配
        };
        
        // 用戶自定義映射（學習記錄）
        this.userMappings = new Map();
        
        // 異體字對照表
        this.variantChars = {
            '爲': '為', '綫': '線', '衆': '眾', '羣': '群',
            '硏': '研', '眞': '真', '臺': '台', '彙': '匯',
            '著': '着', '裏': '裡', '髮': '發', '麵': '面'
        };
        
        // 金額驗證容差（處理浮點誤差）
        this.amountTolerance = 1;  // 允許 ±1 元的誤差（會計實務容許範圍）
        
        // 載入用戶歷史映射
        this.loadUserMappings();
    }
    
    /**
     * 智能欄位映射（主入口）
     * @param {Object} ocrResult - OCR 原始識別結果
     * @returns {Object} 標準化後的發票數據
     */
    mapFields(ocrResult) {
        console.log('[FieldMapper] 開始欄位映射:', ocrResult);
        
        const mappedData = {};
        const unmappedFields = [];
        const confidence = {};
        
        // 遍歷 OCR 結果的每個欄位
        for (const [rawKey, rawValue] of Object.entries(ocrResult)) {
            // 尋找最佳匹配的標準欄位
            const matchResult = this.findBestMatch(rawKey);
            
            if (matchResult.standardField) {
                const stdField = matchResult.standardField;
                
                // 數據類型轉換與驗證
                const convertedValue = this.convertValue(
                    rawValue,
                    this.standardFields[stdField].type
                );
                
                // 驗證數據有效性
                const validator = this.standardFields[stdField].validate;
                const isValid = validator ? validator.call(this, convertedValue) : true;
                
                if (isValid) {
                    mappedData[stdField] = convertedValue;
                    confidence[stdField] = matchResult.confidence;
                } else {
                    console.warn(`[FieldMapper] 欄位驗證失敗: ${stdField} = ${convertedValue}`);
                    unmappedFields.push({ rawKey, rawValue, reason: 'validation_failed' });
                }
            } else {
                // 無法映射的欄位
                unmappedFields.push({ rawKey, rawValue, reason: 'no_match' });
            }
        }
        
        // 三類發票自動拆分（核心新增功能）
        const splitResult = this.splitClass3Invoice(mappedData);
        Object.assign(mappedData, splitResult);
        
        return {
            data: mappedData,
            unmappedFields,
            confidence,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 三類發票自動拆分邏輯 ⭐ 核心新增
     * 
     * 三類發票特性：只有總計金額，需自動拆分為未稅+稅額
     * 計算公式：
     * - 未稅金額 = 總計 ÷ 1.05（四捨五入到整數）
     * - 稅額 = 未稅金額 × 0.05（四捨五入到整數）
     * - 驗算：未稅 + 稅額 = 總計（容許 ±1 元誤差）
     * 
     * @param {Object} data - 映射後的發票數據
     * @returns {Object} - 補充計算結果 { subtotal?, taxAmount?, _splitInfo }
     */
    splitClass3Invoice(data) {
        // 檢查是否需要載入 Decimal.js
        if (typeof Decimal === 'undefined') {
            console.warn('[FieldMapper] Decimal.js 未載入，使用原生 Math（可能有精度問題）');
            return this._splitWithNativeMath(data);
        }
        
        // 設定精度（小數點後 2 位，會計標準）
        Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
        
        const result = {
            _splitInfo: {
                calculated: false,
                isClass3: false,
                warnings: [],
                method: null
            }
        };
        
        // 情境 1：只有總計，沒有未稅和稅額（典型三類發票） ⭐
        if (data.total && !data.subtotal && !data.taxAmount) {
            const total = new Decimal(data.total);
            
            // 計算未稅金額（總計 ÷ 1.05，四捨五入到整數）
            const subtotal = total.dividedBy(1.05).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
            
            // 計算稅額（未稅 × 0.05，四捨五入到整數）
            const tax = subtotal.times(0.05).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
            
            // 驗算：未稅 + 稅額是否等於總計
            const calculatedTotal = subtotal.plus(tax);
            const diff = calculatedTotal.minus(total).abs();
            
            result.subtotal = subtotal.toNumber();
            result.taxAmount = tax.toNumber();
            result._splitInfo.calculated = true;
            result._splitInfo.isClass3 = true;
            result._splitInfo.method = 'total_only';
            
            if (diff.greaterThan(1)) {
                result._splitInfo.warnings.push(
                    `驗算誤差較大：未稅 ${result.subtotal} + 稅額 ${result.taxAmount} = ${calculatedTotal.toNumber()}，總計為 ${data.total}（誤差 ${diff.toNumber()}）`
                );
            }
            
            console.log(`[FieldMapper] 三類發票自動拆分：總計 ${data.total} → 未稅 ${result.subtotal} + 稅額 ${result.taxAmount}`);
            return result;
        }
        
        // 情境 2：有總計和未稅，但沒有稅額（自動計算稅額）
        if (data.total && data.subtotal && !data.taxAmount) {
            const total = new Decimal(data.total);
            const subtotal = new Decimal(data.subtotal);
            
            // 稅額 = 總計 - 未稅
            const tax = total.minus(subtotal).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
            
            result.taxAmount = tax.toNumber();
            result._splitInfo.calculated = true;
            result._splitInfo.method = 'calc_tax';
            result._splitInfo.warnings.push('自動計算稅額：總計 - 未稅');
            
            console.log(`[FieldMapper] 自動計算稅額：${data.total} - ${data.subtotal} = ${result.taxAmount}`);
            return result;
        }
        
        // 情境 3：有總計和稅額，但沒有未稅（自動計算未稅）
        if (data.total && data.taxAmount && !data.subtotal) {
            const total = new Decimal(data.total);
            const tax = new Decimal(data.taxAmount);
            
            // 未稅 = 總計 - 稅額
            const subtotal = total.minus(tax).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
            
            result.subtotal = subtotal.toNumber();
            result._splitInfo.calculated = true;
            result._splitInfo.method = 'calc_subtotal';
            result._splitInfo.warnings.push('自動計算未稅：總計 - 稅額');
            
            console.log(`[FieldMapper] 自動計算未稅：${data.total} - ${data.taxAmount} = ${result.subtotal}`);
            return result;
        }
        
        // 情境 4：三個欄位都有，進行驗算
        if (data.total && data.subtotal && data.taxAmount) {
            const total = new Decimal(data.total);
            const subtotal = new Decimal(data.subtotal);
            const tax = new Decimal(data.taxAmount);
            
            const calculatedTotal = subtotal.plus(tax);
            const diff = calculatedTotal.minus(total).abs();
            
            result._splitInfo.method = 'validate';
            
            if (diff.greaterThan(1)) {
                result._splitInfo.warnings.push(
                    `金額驗算失敗：未稅 ${data.subtotal} + 稅額 ${data.taxAmount} = ${calculatedTotal.toNumber()}，但總計為 ${data.total}（誤差 ${diff.toNumber()}）`
                );
            }
            
            return result;
        }
        
        // 情境 5：沒有任何金額
        result._splitInfo.warnings.push('缺少金額資訊，無法計算');
        return result;
    }
    
    /**
     * 降級方案：使用原生 Math（Decimal.js 未載入時）
     */
    _splitWithNativeMath(data) {
        const result = {
            _splitInfo: {
                calculated: false,
                isClass3: false,
                warnings: ['使用原生 Math 計算，可能有精度問題'],
                method: null
            }
        };
        
        if (data.total && !data.subtotal && !data.taxAmount) {
            const total = data.total;
            const subtotal = Math.round(total / 1.05);
            const tax = Math.round(subtotal * 0.05);
            
            result.subtotal = subtotal;
            result.taxAmount = tax;
            result._splitInfo.calculated = true;
            result._splitInfo.isClass3 = true;
            result._splitInfo.method = 'total_only_native';
            
            const diff = Math.abs(subtotal + tax - total);
            if (diff > 1) {
                result._splitInfo.warnings.push(`驗算誤差：${diff} 元`);
            }
        }
        
        return result;
    }
    
    /**
     * 尋找最佳匹配的標準欄位
     * @param {string} rawKey - OCR 原始欄位名稱
     * @returns {Object} { standardField, confidence, method }
     */
    findBestMatch(rawKey) {
        const normalizedKey = this.normalizeText(rawKey);
        
        // 1. 精確匹配（用戶自定義映射）
        if (this.userMappings.has(normalizedKey)) {
            return {
                standardField: this.userMappings.get(normalizedKey),
                confidence: 1.0,
                method: 'user_mapping'
            };
        }
        
        // 2. 精確匹配（內建字典）
        for (const [stdField, synonyms] of Object.entries(this.synonymDictionary)) {
            if (synonyms.some(syn => this.normalizeText(syn) === normalizedKey)) {
                return { standardField: stdField, confidence: 0.95, method: 'exact_match' };
            }
        }
        
        // 3. 模糊匹配（相似度計算）
        let bestMatch = null;
        let maxSimilarity = 0;
        
        for (const [stdField, synonyms] of Object.entries(this.synonymDictionary)) {
            for (const synonym of synonyms) {
                const similarity = this.calculateSimilarity(normalizedKey, this.normalizeText(synonym));
                
                if (similarity > maxSimilarity && similarity >= this.fuzzyConfig.minSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = stdField;
                }
            }
        }
        
        if (bestMatch) {
            return {
                standardField: bestMatch,
                confidence: maxSimilarity,
                method: 'fuzzy_match'
            };
        }
        
        // 4. 無法匹配
        return { standardField: null, confidence: 0, method: 'no_match' };
    }
    
    /**
     * 文字標準化處理
     */
    normalizeText(text) {
        if (!text) return '';
        
        let normalized = text.toString().trim();
        
        // 異體字轉換
        if (this.fuzzyConfig.enableVariants) {
            for (const [variant, standard] of Object.entries(this.variantChars)) {
                normalized = normalized.replace(new RegExp(variant, 'g'), standard);
            }
        }
        
        // 移除空白字符
        normalized = normalized.replace(/\s+/g, '');
        
        // 全形轉半形
        normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        });
        
        return normalized.toLowerCase();
    }
    
    /**
     * 計算文字相似度（Levenshtein Distance + Jaccard Index）
     */
    calculateSimilarity(str1, str2) {
        // Levenshtein Distance（編輯距離）
        const editDistance = this.levenshteinDistance(str1, str2);
        const maxLen = Math.max(str1.length, str2.length);
        const editSimilarity = 1 - (editDistance / maxLen);
        
        // Jaccard Index（字符集重疊度）
        const set1 = new Set(str1.split(''));
        const set2 = new Set(str2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        const jaccardSimilarity = intersection.size / union.size;
        
        // 綜合評分（編輯距離 60% + Jaccard 40%）
        return editSimilarity * 0.6 + jaccardSimilarity * 0.4;
    }
    
    /**
     * Levenshtein Distance 計算
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,      // 刪除
                        dp[i][j - 1] + 1,      // 插入
                        dp[i - 1][j - 1] + 1   // 替換
                    );
                }
            }
        }
        
        return dp[m][n];
    }
    
    /**
     * 數據類型轉換
     */
    convertValue(value, targetType) {
        if (value === null || value === undefined) return null;
        
        switch (targetType) {
            case 'string':
                return String(value).trim();
                
            case 'number':
                // 移除千分位逗號、貨幣符號
                const cleanNum = String(value)
                    .replace(/[,，]/g, '')
                    .replace(/[NT$￥¥$]/g, '')
                    .trim();
                
                const parsed = parseFloat(cleanNum);
                return isNaN(parsed) ? null : parsed;
                
            case 'date':
                return this.parseDate(value);
                
            case 'array':
                return Array.isArray(value) ? value : [value];
                
            default:
                return value;
        }
    }
    
    /**
     * 日期解析（支援民國/西元/多種格式）
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        const str = String(dateStr).trim();
        
        // 民國日期：113/01/15 或 113.01.15 或 113-01-15
        const rocMatch = str.match(/(\d{2,3})[/.年\-](\d{1,2})[/.月\-](\d{1,2})[日]?/);
        if (rocMatch) {
            const rocYear = parseInt(rocMatch[1]);
            const month = parseInt(rocMatch[2]);
            const day = parseInt(rocMatch[3]);
            const westernYear = rocYear + 1911;
            return `${westernYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        // 西元日期：2024/01/15 或 2024-01-15
        const westernMatch = str.match(/(\d{4})[/.年\-](\d{1,2})[/.月\-](\d{1,2})[日]?/);
        if (westernMatch) {
            const year = parseInt(westernMatch[1]);
            const month = parseInt(westernMatch[2]);
            const day = parseInt(westernMatch[3]);
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        return null;
    }
    
    /**
     * 驗證發票號碼格式
     */
    validateInvoiceNo(value) {
        if (!value) return false;
        // 台灣發票格式：2 個英文字母 + 8 位數字
        return /^[A-Z]{2}\d{8}$/i.test(value);
    }
    
    /**
     * 驗證日期格式
     */
    validateDate(value) {
        if (!value) return false;
        // ISO 8601 格式：YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }
    
    /**
     * 驗證統一編號格式
     */
    validateTaxId(value) {
        if (!value) return false;
        // 台灣統編：8 位數字
        return /^\d{8}$/.test(value);
    }
    
    /**
     * 驗證金額格式
     */
    validateAmount(value) {
        return typeof value === 'number' && !isNaN(value) && value >= 0;
    }
    
    /**
     * 記錄用戶自定義映射（學習功能）
     */
    learnMapping(rawKey, standardField) {
        const normalized = this.normalizeText(rawKey);
        this.userMappings.set(normalized, standardField);
        this.saveUserMappings();
        console.log(`[FieldMapper] 學習新映射: "${rawKey}" → ${standardField}`);
    }
    
    /**
     * 載入用戶映射
     */
    async loadUserMappings() {
        try {
            const stored = localStorage.getItem('ocr_user_mappings');
            if (stored) {
                const data = JSON.parse(stored);
                this.userMappings = new Map(Object.entries(data));
                console.log(`[FieldMapper] 載入 ${this.userMappings.size} 條用戶映射`);
            }
        } catch (error) {
            console.error('[FieldMapper] 載入用戶映射失敗:', error);
        }
    }
    
    /**
     * 保存用戶映射
     */
    saveUserMappings() {
        try {
            const data = Object.fromEntries(this.userMappings);
            localStorage.setItem('ocr_user_mappings', JSON.stringify(data));
        } catch (error) {
            console.error('[FieldMapper] 保存用戶映射失敗:', error);
        }
    }
    
    /**
     * 獲取所有標準欄位定義（供 UI 使用）
     */
    getStandardFields() {
        return this.standardFields;
    }
    
    /**
     * 獲取欄位的所有同義詞（供 UI 使用）
     */
    getSynonyms(standardField) {
        return this.synonymDictionary[standardField] || [];
    }
    
    /**
     * 重置用戶自定義映射
     */
    resetUserMappings() {
        this.userMappings.clear();
        localStorage.removeItem('ocr_user_mappings');
        console.log('[FieldMapper] 用戶映射已重置');
    }
}

// 導出單例實例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvoiceFieldMapper;
} else {
    window.InvoiceFieldMapper = InvoiceFieldMapper;
}
