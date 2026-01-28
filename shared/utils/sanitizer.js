/**
 * XSS 防護與輸入消毒工具
 * 防止注入攻擊，保護系統安全
 */

// 注意：DOMPurify 在 index.html 中通過全局 script 標籤載入
const DOMPurify = window.DOMPurify;

/**
 * 輸入消毒器
 */
export class Sanitizer {
  /**
   * HTML 消毒（用於需要顯示 HTML 的場景）
   * 僅允許安全的 HTML 標籤
   */
  static sanitizeHTML(dirty) {
    if (!dirty) return '';
    
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    });
  }

  /**
   * 純文本轉義（最安全，用於所有用戶輸入）
   * 將所有 HTML 特殊字符轉義
   */
  static escapeHTML(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 數字消毒（防止注入計算公式）
   * 確保輸入為有效數字
   */
  static sanitizeNumber(value) {
    if (value === null || value === undefined) return 0;
    
    // 移除所有非數字字符（保留小數點和負號）
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    
    // 檢查是否為有效數字
    if (isNaN(num) || !isFinite(num)) return 0;
    
    return num;
  }

  /**
   * 整數消毒
   */
  static sanitizeInteger(value) {
    const num = this.sanitizeNumber(value);
    return Math.floor(num);
  }

  /**
   * 日期消毒
   */
  static sanitizeDate(dateString) {
    if (!dateString) return new Date();
    
    const date = new Date(dateString);
    
    // 檢查是否為有效日期
    if (isNaN(date.getTime())) {
      return new Date();
    }
    
    // 檢查日期範圍（1900-2100）
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      return new Date();
    }
    
    return date;
  }

  /**
   * 文件名消毒
   * 移除危險字符，防止路徑穿越攻擊
   */
  static sanitizeFilename(filename) {
    if (!filename) return 'unnamed';
    
    // 移除路徑分隔符和特殊字符
    return filename
      .replace(/[\/\\]/g, '') // 移除斜線
      .replace(/[<>:"|?*]/g, '') // 移除 Windows 非法字符
      .replace(/\.\./g, '') // 移除路徑穿越
      .replace(/^\.+/, '') // 移除開頭的點
      .trim()
      .substring(0, 255); // 限制長度
  }

  /**
   * URL 消毒
   * 確保 URL 安全
   */
  static sanitizeURL(url) {
    if (!url) return '';
    
    try {
      const parsed = new URL(url);
      
      // 只允許 http(s) 協議
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      
      return parsed.href;
    } catch (e) {
      return '';
    }
  }

  /**
   * SQL 注入防護（雖然我們用 IndexedDB，但仍保留此方法）
   * 轉義 SQL 特殊字符
   */
  static escapeSQLString(str) {
    if (!str) return '';
    
    return String(str)
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * 統一身份證字號驗證與消毒
   */
  static sanitizeTaxId(taxId) {
    if (!taxId) return '';
    
    // 移除空格和特殊字符
    const cleaned = String(taxId).replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // 驗證格式（台灣統編8碼或身分證10碼）
    if (!/^[0-9]{8}$|^[A-Z][0-9]{9}$/.test(cleaned)) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * 電話號碼消毒
   */
  static sanitizePhone(phone) {
    if (!phone) return '';
    
    // 保留數字、加號、括號和連字號
    return String(phone).replace(/[^0-9+\-()]/g, '').substring(0, 20);
  }

  /**
   * Email 消毒
   */
  static sanitizeEmail(email) {
    if (!email) return '';
    
    const cleaned = String(email).trim().toLowerCase();
    
    // 簡單的 Email 格式驗證
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * JSON 消毒
   * 確保 JSON 字符串安全
   */
  static sanitizeJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed); // 重新序列化以移除潛在注入
    } catch (e) {
      return '{}';
    }
  }

  /**
   * 表單數據批量消毒
   * @param {Object} formData - 表單數據對象
   * @param {Object} schema - 消毒規則 { field: 'type' }
   */
  static sanitizeFormData(formData, schema) {
    const sanitized = {};
    
    for (const [key, type] of Object.entries(schema)) {
      const value = formData[key];
      
      switch (type) {
        case 'text':
          sanitized[key] = this.escapeHTML(value);
          break;
        case 'html':
          sanitized[key] = this.sanitizeHTML(value);
          break;
        case 'number':
          sanitized[key] = this.sanitizeNumber(value);
          break;
        case 'integer':
          sanitized[key] = this.sanitizeInteger(value);
          break;
        case 'date':
          sanitized[key] = this.sanitizeDate(value);
          break;
        case 'email':
          sanitized[key] = this.sanitizeEmail(value);
          break;
        case 'phone':
          sanitized[key] = this.sanitizePhone(value);
          break;
        case 'taxId':
          sanitized[key] = this.sanitizeTaxId(value);
          break;
        case 'filename':
          sanitized[key] = this.sanitizeFilename(value);
          break;
        case 'url':
          sanitized[key] = this.sanitizeURL(value);
          break;
        default:
          sanitized[key] = this.escapeHTML(value);
      }
    }
    
    return sanitized;
  }

  /**
   * 驗證輸入長度
   */
  static validateLength(value, min = 0, max = Infinity) {
    const len = String(value || '').length;
    return len >= min && len <= max;
  }

  /**
   * 驗證數字範圍
   */
  static validateRange(value, min = -Infinity, max = Infinity) {
    const num = this.sanitizeNumber(value);
    return num >= min && num <= max;
  }
}

/**
 * 安全的計算公式執行器
 * 防止通過公式注入惡意代碼
 */
export class SafeFormulaExecutor {
  /**
   * 允許的數學函數白名單
   */
  static ALLOWED_FUNCTIONS = [
    'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round',
    'Math.max', 'Math.min', 'Math.pow', 'Math.sqrt'
  ];

  /**
   * 允許的運算符白名單
   */
  static ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '?', ':', '>', '<', '=', '!', '&', '|'];

  /**
   * 執行安全公式
   * @param {string} formula - 公式字符串
   * @param {Object} context - 變量上下文
   */
  static execute(formula, context = {}) {
    // 驗證公式安全性
    if (!this.validateFormula(formula)) {
      throw new Error('公式包含不安全的內容');
    }

    try {
      // 創建安全的函數執行環境
      const vars = Object.keys(context);
      const values = Object.values(context);
      
      // 使用 Function 構造器（限制作用域）
      const fn = new Function(...vars, `return ${formula}`);
      const result = fn(...values);
      
      // 驗證結果
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        throw new Error('公式執行結果無效');
      }
      
      return result;
    } catch (error) {
      console.error('公式執行錯誤:', error);
      throw new Error(`公式執行失敗: ${error.message}`);
    }
  }

  /**
   * 驗證公式安全性
   */
  static validateFormula(formula) {
    if (!formula || typeof formula !== 'string') return false;
    
    // 檢查危險關鍵字
    const dangerous = [
      'eval', 'Function', 'setTimeout', 'setInterval',
      'import', 'require', 'process', 'global', 'window',
      'document', 'location', 'cookie', '__proto__'
    ];
    
    for (const keyword of dangerous) {
      if (formula.includes(keyword)) {
        return false;
      }
    }
    
    // 檢查是否只包含允許的字符
    const allowedPattern = /^[0-9a-zA-Z_+\-*/().?:<>=!&|\s]+$/;
    if (!allowedPattern.test(formula)) {
      return false;
    }
    
    return true;
  }
}

export default Sanitizer;
