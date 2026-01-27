/**
 * 高精度數值計算工具
 * 使用 Decimal.js 避免浮點運算誤差
 */

// 注意：Decimal 在 index.html 中通過全局 script 標籤載入
const Decimal = window.Decimal;

// 配置 Decimal.js
Decimal.set({
  precision: 20,        // 精度 20 位
  rounding: Decimal.ROUND_HALF_UP,  // 四捨五入
  toExpNeg: -7,
  toExpPos: 21
});

/**
 * 稅務計算器 - 所有金額計算的核心類
 */
export class TaxCalculator {
  /**
   * 乘法
   */
  static multiply(a, b) {
    return new Decimal(a).times(b).toNumber();
  }

  /**
   * 除法
   */
  static divide(a, b) {
    if (b === 0) throw new Error('除數不能為零');
    return new Decimal(a).dividedBy(b).toNumber();
  }

  /**
   * 加法
   */
  static add(...values) {
    return values.reduce((sum, val) => 
      new Decimal(sum).plus(val), new Decimal(0)
    ).toNumber();
  }

  /**
   * 減法
   */
  static subtract(a, b) {
    return new Decimal(a).minus(b).toNumber();
  }

  /**
   * 四捨五入至整數（稅額標準）
   */
  static round(value) {
    return new Decimal(value)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  /**
   * 無條件捨去至整數
   */
  static floor(value) {
    return new Decimal(value)
      .toDecimalPlaces(0, Decimal.ROUND_DOWN)
      .toNumber();
  }

  /**
   * 無條件進位至整數
   */
  static ceil(value) {
    return new Decimal(value)
      .toDecimalPlaces(0, Decimal.ROUND_UP)
      .toNumber();
  }

  /**
   * 百分比計算
   * @param {number} value - 基數
   * @param {number} percentage - 百分比（例如 5 表示 5%）
   */
  static percentage(value, percentage) {
    return new Decimal(value)
      .times(percentage)
      .dividedBy(100)
      .toNumber();
  }

  /**
   * 累進稅率計算
   * @param {number} income - 應稅所得
   * @param {Array} brackets - 稅率級距 [{limit, rate}, ...]
   */
  static calculateProgressiveTax(income, brackets) {
    let tax = new Decimal(0);
    let remaining = new Decimal(income);
    let previousLimit = new Decimal(0);

    for (const bracket of brackets) {
      if (remaining.lte(0)) break;

      const bracketLimit = bracket.limit === Infinity 
        ? remaining 
        : new Decimal(bracket.limit);
      
      const bracketRange = bracketLimit.minus(previousLimit);
      const taxableAmount = Decimal.min(remaining, bracketRange);

      tax = tax.plus(taxableAmount.times(bracket.rate));
      remaining = remaining.minus(taxableAmount);
      previousLimit = bracketLimit;
    }

    return this.round(tax);
  }

  /**
   * 速算公式計算（累進稅率簡化）
   * @param {number} income - 應稅所得
   * @param {number} rate - 適用稅率
   * @param {number} deduction - 速算扣除數
   */
  static quickTaxFormula(income, rate, deduction) {
    return this.round(
      new Decimal(income).times(rate).minus(deduction)
    );
  }

  /**
   * 比較兩個數值
   */
  static compare(a, b) {
    const diff = new Decimal(a).minus(b);
    if (diff.isZero()) return 0;
    return diff.isPositive() ? 1 : -1;
  }

  /**
   * 檢查是否相等（考慮精度）
   */
  static equals(a, b, tolerance = 0.01) {
    return new Decimal(a).minus(b).abs().lte(tolerance);
  }

  /**
   * 格式化金額顯示
   */
  static formatCurrency(value, options = {}) {
    const {
      currency = 'TWD',
      locale = 'zh-TW',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value);
  }

  /**
   * 格式化數字（千分位）
   */
  static formatNumber(value, decimals = 0) {
    return new Decimal(value)
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * 安全解析數字輸入
   */
  static parseNumber(input) {
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
      // 移除千分位逗號和貨幣符號
      const cleaned = input.replace(/[,\$NT]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
}

/**
 * 日期範圍計算（用於利息計算）
 */
export class DateCalculator {
  /**
   * 計算兩個日期之間的天數
   */
  static daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 計算利息（按日計息）
   * @param {number} principal - 本金
   * @param {number} annualRate - 年利率（例如 0.01725 表示 1.725%）
   * @param {Date} startDate - 起始日
   * @param {Date} endDate - 結束日
   */
  static calculateInterest(principal, annualRate, startDate, endDate) {
    const days = this.daysBetween(startDate, endDate);
    return TaxCalculator.round(
      new Decimal(principal)
        .times(annualRate)
        .times(days)
        .dividedBy(365)
    );
  }

  /**
   * 滯納金計算（每逾3日1%）
   */
  static calculateLateFee(taxAmount, dueDate, paymentDate) {
    const overdueDays = this.daysBetween(dueDate, paymentDate);
    
    if (overdueDays < 3) return 0;
    
    const periods = Math.ceil(overdueDays / 3);
    const feeRate = Math.min(periods * 0.01, 0.10); // 上限10%
    
    return TaxCalculator.round(
      new Decimal(taxAmount).times(feeRate)
    );
  }

  /**
   * 添加月份
   */
  static addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * 格式化日期
   */
  static format(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  }
}

export default TaxCalculator;
