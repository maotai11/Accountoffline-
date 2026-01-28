/**
 * 發票驗證引擎 - 會計專用核對系統
 * 
 * 核心功能：
 * 1. 統編核對：檢查識別的統編是否與用戶輸入一致
 * 2. 日期期間驗證：標記超出期間的發票（可容許小於等於期間起始）
 * 3. 金額邏輯驗證：未稅 + 稅額 = 總計（容許 ±1 元誤差）
 * 4. 必填欄位檢查：發票號、日期、統編、總計
 * 5. 異常分類標記：統編不符、日期超範圍、金額錯誤、欄位缺失
 * 
 * 驗證規則：
 * ┌──────────────┬────────────────────────────────────┐
 * │ 驗證項目      │ 規則                                │
 * ├──────────────┼────────────────────────────────────┤
 * │ 統編核對      │ 必須完全一致（8 位數字）            │
 * │ 日期期間      │ 大於期間結束 → 標記異常              │
 * │               │ 小於等於期間起始 → 容許（可能補開） │
 * │ 金額邏輯      │ 未稅 + 稅額 = 總計 ± 1 元           │
 * │ 必填欄位      │ 發票號、日期、統編、總計            │
 * └──────────────┴────────────────────────────────────┘
 * 
 * 使用範例：
 * ```javascript
 * const validator = new InvoiceValidator({
 *   expectedTaxId: '12345678',
 *   periodStart: '2024-11-01',
 *   periodEnd: '2024-12-31'
 * });
 * 
 * const result = validator.validate(invoiceData);
 * // result = { valid, errors, warnings, severity }
 * ```
 * 
 * @version 1.0.0
 * @author 會計事務所內控作業系統
 */

class InvoiceValidator {
    constructor(config = {}) {
        // 驗證配置
        this.config = {
            expectedTaxId: config.expectedTaxId || null,       // 預期買方統編
            periodStart: config.periodStart || null,           // 期間起始日（YYYY-MM-DD）
            periodEnd: config.periodEnd || null,               // 期間結束日（YYYY-MM-DD）
            allowEarlierDate: config.allowEarlierDate !== false,  // 容許早於期間起始（預設 true）
            strictMode: config.strictMode || false,            // 嚴格模式（所有 warning 視為 error）
            amountTolerance: config.amountTolerance || 1       // 金額容差（預設 ±1 元）
        };
        
        // 驗證統計
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0,
            taxIdMismatch: 0,
            dateOutOfRange: 0,
            amountError: 0,
            missingFields: 0
        };
    }
    
    /**
     * 驗證單張發票（主入口）
     * @param {Object} invoice - 發票數據
     * @returns {Object} 驗證結果 { valid, errors, warnings, severity, invoice }
     */
    validate(invoice) {
        console.log('[Validator] 驗證發票:', invoice.invoiceNo || 'Unknown');
        
        this.stats.total++;
        
        const result = {
            valid: true,
            errors: [],       // 致命錯誤（必須修正）
            warnings: [],     // 警告（建議檢查）
            severity: 'none', // 'none', 'warning', 'error'
            invoice: { ...invoice }
        };
        
        // 1. 必填欄位檢查
        this._validateRequiredFields(invoice, result);
        
        // 2. 統編核對
        this._validateTaxId(invoice, result);
        
        // 3. 日期期間驗證
        this._validateDatePeriod(invoice, result);
        
        // 4. 金額邏輯驗證
        this._validateAmountLogic(invoice, result);
        
        // 5. 欄位格式驗證
        this._validateFormats(invoice, result);
        
        // 計算整體嚴重性
        if (result.errors.length > 0) {
            result.valid = false;
            result.severity = 'error';
            this.stats.invalid++;
        } else if (result.warnings.length > 0) {
            result.severity = 'warning';
            this.stats.valid++;
        } else {
            result.severity = 'none';
            this.stats.valid++;
        }
        
        // 嚴格模式：警告視為錯誤
        if (this.config.strictMode && result.warnings.length > 0) {
            result.valid = false;
            result.severity = 'error';
            result.errors.push(...result.warnings);
            result.warnings = [];
        }
        
        return result;
    }
    
    /**
     * 批量驗證多張發票
     * @param {Array} invoices - 發票數組
     * @returns {Object} { results, summary }
     */
    validateBatch(invoices) {
        console.log(`[Validator] 批量驗證 ${invoices.length} 張發票`);
        
        const results = invoices.map(invoice => this.validate(invoice));
        
        const summary = {
            total: results.length,
            valid: results.filter(r => r.valid).length,
            invalid: results.filter(r => !r.valid).length,
            withWarnings: results.filter(r => r.warnings.length > 0).length,
            withErrors: results.filter(r => r.errors.length > 0).length,
            stats: { ...this.stats }
        };
        
        return { results, summary };
    }
    
    /**
     * 驗證必填欄位
     */
    _validateRequiredFields(invoice, result) {
        const requiredFields = [
            { field: 'invoiceNo', name: '發票號碼' },
            { field: 'date', name: '日期' },
            { field: 'taxId', name: '買方統編' },
            { field: 'total', name: '總計金額' }
        ];
        
        const missingFields = [];
        
        for (const { field, name } of requiredFields) {
            if (!invoice[field]) {
                missingFields.push(name);
            }
        }
        
        if (missingFields.length > 0) {
            result.errors.push({
                type: 'missing_fields',
                message: `缺少必填欄位：${missingFields.join('、')}`,
                fields: missingFields
            });
            this.stats.missingFields++;
        }
    }
    
    /**
     * 統編核對 ⭐ 核心功能
     * 
     * 規則：
     * - 如果設定了 expectedTaxId，必須完全一致
     * - 不一致標記為 error（致命錯誤）
     */
    _validateTaxId(invoice, result) {
        if (!this.config.expectedTaxId) {
            return; // 未設定預期統編，跳過驗證
        }
        
        if (!invoice.taxId) {
            return; // 已在必填欄位檢查中處理
        }
        
        const expected = String(this.config.expectedTaxId).trim();
        const actual = String(invoice.taxId).trim();
        
        if (expected !== actual) {
            result.errors.push({
                type: 'tax_id_mismatch',
                message: `買方統編不符：預期 ${expected}，實際 ${actual}`,
                expected,
                actual
            });
            this.stats.taxIdMismatch++;
            
            // 標記發票數據
            result.invoice._taxIdMismatch = true;
        }
    }
    
    /**
     * 日期期間驗證 ⭐ 核心功能
     * 
     * 規則：
     * - 日期 > periodEnd：標記為 error（超出期間）
     * - 日期 < periodStart：標記為 warning（可能是補開，容許）
     * - periodStart ≤ 日期 ≤ periodEnd：正常
     * 
     * 範例：
     * - 輸入期間：2024-11-01 ~ 2024-12-31
     * - 發票日期 2025-01-15：error（超出）
     * - 發票日期 2024-10-25：warning（早於期間，但容許）
     * - 發票日期 2024-11-15：正常
     */
    _validateDatePeriod(invoice, result) {
        if (!this.config.periodStart || !this.config.periodEnd) {
            return; // 未設定期間，跳過驗證
        }
        
        if (!invoice.date) {
            return; // 已在必填欄位檢查中處理
        }
        
        const invoiceDate = new Date(invoice.date);
        const periodStart = new Date(this.config.periodStart);
        const periodEnd = new Date(this.config.periodEnd);
        
        // 檢查日期有效性
        if (isNaN(invoiceDate.getTime())) {
            result.errors.push({
                type: 'invalid_date',
                message: `日期格式錯誤：${invoice.date}`,
                date: invoice.date
            });
            return;
        }
        
        // 情境 1：日期晚於期間結束（error）
        if (invoiceDate > periodEnd) {
            const daysDiff = Math.ceil((invoiceDate - periodEnd) / (1000 * 60 * 60 * 24));
            
            result.errors.push({
                type: 'date_out_of_range',
                message: `發票日期超出期間：${invoice.date}（晚於 ${this.config.periodEnd} ${daysDiff} 天）`,
                date: invoice.date,
                periodEnd: this.config.periodEnd,
                daysDiff
            });
            this.stats.dateOutOfRange++;
            
            // 標記發票數據
            result.invoice._dateOutOfRange = true;
            result.invoice._dateStatus = 'after_period';
        }
        
        // 情境 2：日期早於期間起始（warning，可能是補開）
        else if (invoiceDate < periodStart) {
            if (!this.config.allowEarlierDate) {
                result.errors.push({
                    type: 'date_before_period',
                    message: `發票日期早於期間起始：${invoice.date}（早於 ${this.config.periodStart}）`,
                    date: invoice.date,
                    periodStart: this.config.periodStart
                });
                this.stats.dateOutOfRange++;
                result.invoice._dateOutOfRange = true;
            } else {
                const daysDiff = Math.ceil((periodStart - invoiceDate) / (1000 * 60 * 60 * 24));
                
                result.warnings.push({
                    type: 'date_before_period',
                    message: `發票日期早於期間起始：${invoice.date}（早於 ${this.config.periodStart} ${daysDiff} 天，可能是補開發票）`,
                    date: invoice.date,
                    periodStart: this.config.periodStart,
                    daysDiff
                });
                
                result.invoice._dateStatus = 'before_period';
            }
        }
        
        // 情境 3：日期在期間內（正常）
        else {
            result.invoice._dateStatus = 'in_period';
        }
    }
    
    /**
     * 金額邏輯驗證
     * 
     * 規則：未稅 + 稅額 = 總計 ± 容差
     */
    _validateAmountLogic(invoice, result) {
        const { subtotal, taxAmount, total } = invoice;
        
        // 如果缺少任何金額欄位，跳過邏輯驗證
        if (!subtotal || !taxAmount || !total) {
            return;
        }
        
        const calculated = subtotal + taxAmount;
        const diff = Math.abs(calculated - total);
        
        if (diff > this.config.amountTolerance) {
            result.errors.push({
                type: 'amount_logic_error',
                message: `金額邏輯錯誤：未稅 ${subtotal} + 稅額 ${taxAmount} = ${calculated}，但總計為 ${total}（誤差 ${diff}）`,
                subtotal,
                taxAmount,
                total,
                calculated,
                difference: diff
            });
            this.stats.amountError++;
            
            // 標記發票數據
            result.invoice._amountError = true;
        }
    }
    
    /**
     * 欄位格式驗證
     */
    _validateFormats(invoice, result) {
        // 發票號碼格式：2 個英文字母 + 8 位數字
        if (invoice.invoiceNo && !/^[A-Z]{2}\d{8}$/i.test(invoice.invoiceNo)) {
            result.warnings.push({
                type: 'invalid_invoice_no_format',
                message: `發票號碼格式可能錯誤：${invoice.invoiceNo}（標準格式：2 個英文字母 + 8 位數字）`,
                invoiceNo: invoice.invoiceNo
            });
        }
        
        // 統編格式：8 位數字
        if (invoice.taxId && !/^\d{8}$/.test(invoice.taxId)) {
            result.warnings.push({
                type: 'invalid_tax_id_format',
                message: `統編格式可能錯誤：${invoice.taxId}（標準格式：8 位數字）`,
                taxId: invoice.taxId
            });
        }
        
        // 日期格式：YYYY-MM-DD
        if (invoice.date && !/^\d{4}-\d{2}-\d{2}$/.test(invoice.date)) {
            result.warnings.push({
                type: 'invalid_date_format',
                message: `日期格式可能錯誤：${invoice.date}（標準格式：YYYY-MM-DD）`,
                date: invoice.date
            });
        }
        
        // 金額必須為正數
        if (invoice.total && invoice.total < 0) {
            result.errors.push({
                type: 'negative_amount',
                message: `總計金額不可為負數：${invoice.total}`,
                total: invoice.total
            });
        }
    }
    
    /**
     * 更新驗證配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('[Validator] 更新驗證配置:', this.config);
    }
    
    /**
     * 重置統計數據
     */
    resetStats() {
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0,
            taxIdMismatch: 0,
            dateOutOfRange: 0,
            amountError: 0,
            missingFields: 0
        };
    }
    
    /**
     * 獲取驗證統計
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * 產生驗證報告（供導出使用）
     */
    generateReport(results) {
        const summary = {
            validationTime: new Date().toISOString(),
            config: { ...this.config },
            stats: { ...this.stats },
            errorBreakdown: {
                taxIdMismatch: results.filter(r => 
                    r.errors.some(e => e.type === 'tax_id_mismatch')
                ).length,
                dateOutOfRange: results.filter(r => 
                    r.errors.some(e => e.type === 'date_out_of_range')
                ).length,
                amountError: results.filter(r => 
                    r.errors.some(e => e.type === 'amount_logic_error')
                ).length,
                missingFields: results.filter(r => 
                    r.errors.some(e => e.type === 'missing_fields')
                ).length
            }
        };
        
        return summary;
    }
    
    /**
     * 根據驗證結果過濾發票
     * @param {Array} results - 驗證結果數組
     * @param {String} filter - 'all', 'valid', 'invalid', 'warnings', 'errors'
     * @returns {Array} 過濾後的發票
     */
    filterResults(results, filter = 'all') {
        switch (filter) {
            case 'valid':
                return results.filter(r => r.valid && r.warnings.length === 0);
            case 'invalid':
                return results.filter(r => !r.valid);
            case 'warnings':
                return results.filter(r => r.warnings.length > 0);
            case 'errors':
                return results.filter(r => r.errors.length > 0);
            case 'tax_id_mismatch':
                return results.filter(r => r.invoice._taxIdMismatch);
            case 'date_out_of_range':
                return results.filter(r => r.invoice._dateOutOfRange);
            case 'amount_error':
                return results.filter(r => r.invoice._amountError);
            default:
                return results;
        }
    }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvoiceValidator;
} else {
    window.InvoiceValidator = InvoiceValidator;
}
