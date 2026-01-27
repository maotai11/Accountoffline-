/**
 * 扣繳稅額計算引擎
 * 實現各類所得扣繳規則（2025年度）
 */

import { TaxCalculator } from '../../utils/decimal.js';
import { Sanitizer } from '../../utils/sanitizer.js';

export class WithholdingEngine {
  /**
   * 扣繳類別定義
   */
  static INCOME_TYPES = {
    SALARY: 'salary',           // 薪資所得
    RENT: 'rent',               // 租金所得
    COMMISSION: 'commission',   // 佣金所得
    ROYALTY: 'royalty',         // 權利金所得
    BONUS: 'bonus',             // 獎金給與
    PROFESSIONAL: 'professional', // 執行業務所得
    RETIREMENT: 'retirement',   // 退職所得
    INTEREST: 'interest',       // 利息所得
    DIVIDEND: 'dividend'        // 股利所得
  };

  /**
   * 計算扣繳稅額（主入口）
   * @param {Object} params - 計算參數
   * @returns {Object} 計算結果
   */
  static calculate(params) {
    // 參數消毒
    const sanitized = Sanitizer.sanitizeFormData(params, {
      incomeType: 'text',
      amount: 'number',
      isResident: 'text',
      monthlyInsuredSalary: 'number',
      exemptionAmount: 'number'
    });

    const { incomeType, amount, isResident, monthlyInsuredSalary, exemptionAmount } = sanitized;

    // 驗證輸入
    if (amount <= 0) {
      return this._errorResult('給付金額必須大於零');
    }

    // 根據所得類別調用對應計算方法
    let result;
    switch (incomeType) {
      case this.INCOME_TYPES.SALARY:
        result = this._calculateSalary(amount, isResident, monthlyInsuredSalary);
        break;
      case this.INCOME_TYPES.RENT:
        result = this._calculateRent(amount, isResident);
        break;
      case this.INCOME_TYPES.COMMISSION:
      case this.INCOME_TYPES.ROYALTY:
      case this.INCOME_TYPES.BONUS:
      case this.INCOME_TYPES.PROFESSIONAL:
        result = this._calculateStandard(amount, isResident, incomeType);
        break;
      case this.INCOME_TYPES.RETIREMENT:
        result = this._calculateRetirement(amount, isResident, exemptionAmount);
        break;
      case this.INCOME_TYPES.INTEREST:
        result = this._calculateInterest(amount, isResident);
        break;
      case this.INCOME_TYPES.DIVIDEND:
        result = this._calculateDividend(amount, isResident);
        break;
      default:
        return this._errorResult('不支援的所得類別');
    }

    return result;
  }

  /**
   * 薪資所得扣繳
   */
  static _calculateSalary(amount, isResident, monthlyInsuredSalary = 0) {
    const steps = [];
    let withholdingAmount = 0;
    let applicableRule = '';

    if (isResident) {
      // 本國居民
      if (amount >= 88501) {
        withholdingAmount = TaxCalculator.multiply(amount, 0.05);
        applicableRule = '月薪 ≥ 88,501 元，扣繳 5%';
        steps.push({
          description: '適用本國居民薪資扣繳',
          formula: `${TaxCalculator.formatNumber(amount)} × 5%`,
          result: withholdingAmount
        });
      } else {
        applicableRule = '月薪 < 88,501 元，免扣繳';
        steps.push({
          description: '月薪未達起扣點',
          formula: '免扣繳',
          result: 0
        });
      }
    } else {
      // 非居民
      const basicWageLimit = TaxCalculator.multiply(28590, 1.5); // 基本工資 1.5 倍
      
      if (amount <= basicWageLimit) {
        withholdingAmount = TaxCalculator.multiply(amount, 0.06);
        applicableRule = `月薪 ≤ ${TaxCalculator.formatNumber(basicWageLimit)} 元，扣繳 6%`;
        steps.push({
          description: '非居民薪資（基本工資1.5倍內）',
          formula: `${TaxCalculator.formatNumber(amount)} × 6%`,
          result: withholdingAmount
        });
      } else {
        withholdingAmount = TaxCalculator.multiply(amount, 0.18);
        applicableRule = `月薪 > ${TaxCalculator.formatNumber(basicWageLimit)} 元，扣繳 18%`;
        steps.push({
          description: '非居民薪資（超過基本工資1.5倍）',
          formula: `${TaxCalculator.formatNumber(amount)} × 18%`,
          result: withholdingAmount
        });
      }
    }

    return {
      success: true,
      withholdingAmount: TaxCalculator.round(withholdingAmount),
      netPayment: TaxCalculator.subtract(amount, withholdingAmount),
      rate: withholdingAmount / amount,
      applicableRule,
      steps,
      legalBasis: '所得稅法第88條、各類所得扣繳率標準'
    };
  }

  /**
   * 租金所得扣繳
   */
  static _calculateRent(amount, isResident) {
    const rate = isResident ? 0.10 : 0.20;
    const withholdingAmount = TaxCalculator.multiply(amount, rate);

    return {
      success: true,
      withholdingAmount: TaxCalculator.round(withholdingAmount),
      netPayment: TaxCalculator.subtract(amount, withholdingAmount),
      rate,
      applicableRule: isResident ? '本國個人 10%' : '非居民 20%',
      steps: [{
        description: '租金所得扣繳',
        formula: `${TaxCalculator.formatNumber(amount)} × ${rate * 100}%`,
        result: withholdingAmount
      }],
      legalBasis: '所得稅法第88條'
    };
  }

  /**
   * 標準扣繳（佣金/權利金/獎金/執行業務）
   */
  static _calculateStandard(amount, isResident, incomeType) {
    const steps = [];
    let withholdingAmount = 0;
    let applicableRule = '';

    // 執行業務所得有免扣門檻
    if (incomeType === this.INCOME_TYPES.PROFESSIONAL && amount < 5000) {
      return {
        success: true,
        withholdingAmount: 0,
        netPayment: amount,
        rate: 0,
        applicableRule: '單次給付 < 5,000 元，免扣繳',
        steps: [{ description: '未達免扣門檻', formula: '免扣繳', result: 0 }],
        legalBasis: '所得稅法第88條'
      };
    }

    const rate = isResident ? 0.10 : 0.20;
    withholdingAmount = TaxCalculator.multiply(amount, rate);
    applicableRule = isResident ? '本國人 10%' : '非居民 20%';

    steps.push({
      description: this._getIncomeTypeName(incomeType) + '扣繳',
      formula: `${TaxCalculator.formatNumber(amount)} × ${rate * 100}%`,
      result: withholdingAmount
    });

    return {
      success: true,
      withholdingAmount: TaxCalculator.round(withholdingAmount),
      netPayment: TaxCalculator.subtract(amount, withholdingAmount),
      rate,
      applicableRule,
      steps,
      legalBasis: '所得稅法第88條'
    };
  }

  /**
   * 退職所得扣繳
   */
  static _calculateRetirement(amount, isResident, exemptionAmount = 1500000) {
    const steps = [];
    let withholdingAmount = 0;
    let taxableAmount = 0;

    if (isResident) {
      // 本國人：扣除免稅額後按 6% 扣繳
      taxableAmount = Math.max(0, TaxCalculator.subtract(amount, exemptionAmount));
      withholdingAmount = TaxCalculator.multiply(taxableAmount, 0.06);

      steps.push({
        description: '退職所得總額',
        formula: TaxCalculator.formatNumber(amount),
        result: amount
      });
      steps.push({
        description: '減除免稅額',
        formula: `- ${TaxCalculator.formatNumber(exemptionAmount)}`,
        result: -exemptionAmount
      });
      steps.push({
        description: '應稅退職所得',
        formula: TaxCalculator.formatNumber(taxableAmount),
        result: taxableAmount
      });
      steps.push({
        description: '扣繳稅額（6%）',
        formula: `${TaxCalculator.formatNumber(taxableAmount)} × 6%`,
        result: withholdingAmount
      });
    } else {
      // 非居民：全額 18%
      withholdingAmount = TaxCalculator.multiply(amount, 0.18);
      steps.push({
        description: '非居民退職所得扣繳',
        formula: `${TaxCalculator.formatNumber(amount)} × 18%`,
        result: withholdingAmount
      });
    }

    return {
      success: true,
      withholdingAmount: TaxCalculator.round(withholdingAmount),
      netPayment: TaxCalculator.subtract(amount, withholdingAmount),
      rate: withholdingAmount / amount,
      applicableRule: isResident ? `扣除免稅額 ${TaxCalculator.formatCurrency(exemptionAmount)} 後，餘額 6%` : '非居民 18%',
      steps,
      legalBasis: '所得稅法第88條'
    };
  }

  /**
   * 利息所得扣繳
   */
  static _calculateInterest(amount, isResident) {
    const rate = isResident ? 0.10 : 0.20;
    const withholdingAmount = TaxCalculator.multiply(amount, rate);

    return {
      success: true,
      withholdingAmount: TaxCalculator.round(withholdingAmount),
      netPayment: TaxCalculator.subtract(amount, withholdingAmount),
      rate,
      applicableRule: isResident ? '本國個人 10%' : '非居民 20%',
      steps: [{
        description: '利息所得扣繳',
        formula: `${TaxCalculator.formatNumber(amount)} × ${rate * 100}%`,
        result: withholdingAmount
      }],
      legalBasis: '所得稅法第88條',
      note: isResident ? '本國個人享有儲蓄投資特別扣除額 270,000 元' : null
    };
  }

  /**
   * 股利所得扣繳
   */
  static _calculateDividend(amount, isResident) {
    if (isResident) {
      // 本國個人股利免扣繳，但需列單申報
      return {
        success: true,
        withholdingAmount: 0,
        netPayment: amount,
        rate: 0,
        applicableRule: '本國個人股利免扣繳，需列單申報',
        steps: [{ description: '本國個人股利', formula: '免扣繳', result: 0 }],
        legalBasis: '所得稅法第88條',
        note: '年度申報時可選擇併入綜所稅或分開計稅 28%'
      };
    } else {
      // 非居民/境外股東 21%
      const withholdingAmount = TaxCalculator.multiply(amount, 0.21);
      return {
        success: true,
        withholdingAmount: TaxCalculator.round(withholdingAmount),
        netPayment: TaxCalculator.subtract(amount, withholdingAmount),
        rate: 0.21,
        applicableRule: '非居民/境外股東 21%',
        steps: [{
          description: '股利所得扣繳',
          formula: `${TaxCalculator.formatNumber(amount)} × 21%`,
          result: withholdingAmount
        }],
        legalBasis: '所得稅法第88條'
      };
    }
  }

  /**
   * 輔助方法：取得所得類別名稱
   */
  static _getIncomeTypeName(incomeType) {
    const names = {
      [this.INCOME_TYPES.COMMISSION]: '佣金所得',
      [this.INCOME_TYPES.ROYALTY]: '權利金所得',
      [this.INCOME_TYPES.BONUS]: '獎金給與',
      [this.INCOME_TYPES.PROFESSIONAL]: '執行業務所得'
    };
    return names[incomeType] || incomeType;
  }

  /**
   * 錯誤結果
   */
  static _errorResult(message) {
    return {
      success: false,
      error: message,
      withholdingAmount: 0,
      netPayment: 0,
      rate: 0
    };
  }
}

export default WithholdingEngine;
