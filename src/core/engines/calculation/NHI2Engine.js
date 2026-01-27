/**
 * 二代健保補充保費計算引擎（2025年度）
 * 費率：2.11%
 */

import { TaxCalculator } from '../../utils/decimal.js';

export class NHI2Engine {
  static RATE = 0.0211; // 2.11%
  static MAX_BASE = 10000000; // 單次上限 1000 萬

  /**
   * 計算補充保費
   */
  static calculate(params) {
    const { incomeType, amount, insuredSalary = 0 } = params;

    switch (incomeType) {
      case 'bonus':
        return this._calculateBonus(amount, insuredSalary);
      case 'parttime':
        return this._calculateParttime(amount);
      case 'professional':
      case 'dividend':
      case 'interest':
      case 'rent':
        return this._calculateStandard(amount, incomeType);
      default:
        return { success: false, error: '不支援的所得類別' };
    }
  }

  /**
   * 高額獎金補充保費
   */
  static _calculateBonus(bonus, insuredSalary) {
    const threshold = TaxCalculator.multiply(insuredSalary, 4);
    const exceedAmount = Math.max(0, TaxCalculator.subtract(bonus, threshold));
    const premiumBase = Math.min(exceedAmount, this.MAX_BASE);
    const premium = TaxCalculator.round(TaxCalculator.multiply(premiumBase, this.RATE));

    return {
      success: true,
      premium,
      premiumBase,
      rate: this.RATE,
      threshold,
      applicableRule: `獎金超過投保薪資 4 倍（${TaxCalculator.formatCurrency(threshold)}）部分`,
      legalBasis: '全民健康保險法第31條'
    };
  }

  /**
   * 兼職收入補充保費
   */
  static _calculateParttime(amount) {
    const BASIC_WAGE = 28590;
    if (amount < BASIC_WAGE) {
      return {
        success: true,
        premium: 0,
        premiumBase: 0,
        rate: 0,
        threshold: BASIC_WAGE,
        applicableRule: `單次給付 < ${TaxCalculator.formatCurrency(BASIC_WAGE)}（基本工資），免計收`,
        legalBasis: '全民健康保險法第31條'
      };
    }

    const premiumBase = Math.min(amount, this.MAX_BASE);
    const premium = TaxCalculator.round(TaxCalculator.multiply(premiumBase, this.RATE));

    return {
      success: true,
      premium,
      premiumBase,
      rate: this.RATE,
      threshold: BASIC_WAGE,
      applicableRule: `兼職收入 ≥ 基本工資，全額計收 2.11%`,
      legalBasis: '全民健康保險法第31條'
    };
  }

  /**
   * 標準補充保費（執行業務/股利/利息/租金）
   */
  static _calculateStandard(amount, incomeType) {
    const THRESHOLD = 20000;
    if (amount < THRESHOLD) {
      return {
        success: true,
        premium: 0,
        premiumBase: 0,
        rate: 0,
        threshold: THRESHOLD,
        applicableRule: `單次給付 < ${TaxCalculator.formatCurrency(THRESHOLD)}，免計收`,
        legalBasis: '全民健康保險法第31條'
      };
    }

    const premiumBase = Math.min(amount, this.MAX_BASE);
    const premium = TaxCalculator.round(TaxCalculator.multiply(premiumBase, this.RATE));

    return {
      success: true,
      premium,
      premiumBase,
      rate: this.RATE,
      threshold: THRESHOLD,
      applicableRule: `單次給付 ≥ ${TaxCalculator.formatCurrency(THRESHOLD)}，全額計收 2.11%`,
      legalBasis: '全民健康保險法第31條'
    };
  }
}

export default NHI2Engine;
