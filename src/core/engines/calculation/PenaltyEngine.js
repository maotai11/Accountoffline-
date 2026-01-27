/**
 * 滯納金與罰鍰計算引擎
 * Penalty & Late Payment Interest Engine
 * 
 * 功能：
 * - 滯納金計算（逾期未繳）
 * - 滯納利息計算（按日計息）
 * - 怠報金計算
 * - 罰鍰計算
 */

import { Decimal } from '../../utils/decimal.js';

export class PenaltyEngine {
  constructor() {
    // 法定滯納金加徵率
    this.LATE_PAYMENT_RATES = {
      first: 0.01,   // 第一次加徵 1%
      second: 0.02,  // 第二次加徵 2%
      third: 0.03    // 第三次加徵 3%
    };

    // 滯納利息日利率
    this.DAILY_INTEREST_RATE = 0.0001; // 萬分之一

    // 怠報金標準
    this.FAILURE_TO_FILE_PENALTY = {
      min: 1500,     // 最低 1,500 元
      max: 15000     // 最高 15,000 元
    };
  }

  /**
   * 計算滯納金
   * @param {Object} params - 計算參數
   * @param {number} params.taxAmount - 應納稅額
   * @param {Date|string} params.dueDate - 繳納期限
   * @param {Date|string} params.paymentDate - 實際繳納日期
   * @returns {Object} 計算結果
   */
  calculateLatePenalty(params) {
    const {
      taxAmount,
      dueDate,
      paymentDate = new Date()
    } = params;

    // 輸入驗證
    if (!taxAmount || taxAmount <= 0) {
      throw new Error('應納稅額必須為正數');
    }
    if (!dueDate) {
      throw new Error('必須提供繳納期限');
    }

    const tax = new Decimal(taxAmount);
    const due = new Date(dueDate);
    const payment = new Date(paymentDate);

    // 計算逾期天數
    const overdueDays = Math.floor((payment - due) / (1000 * 60 * 60 * 24));

    if (overdueDays <= 0) {
      return {
        taxAmount: tax.toNumber(),
        overdueDays: 0,
        latePenalty: 0,
        totalAmount: tax.toNumber(),
        message: '未逾期，無需加徵滯納金',
        calculatedAt: new Date().toISOString()
      };
    }

    // 計算加徵次數（每 30 天一次，最多 3 次）
    let penaltyCount = Math.min(Math.floor(overdueDays / 30) + 1, 3);
    let totalPenaltyRate = new Decimal(0);
    let penaltyDetails = [];

    // 累加滯納金率
    if (penaltyCount >= 1) {
      totalPenaltyRate = totalPenaltyRate.plus(this.LATE_PAYMENT_RATES.first);
      penaltyDetails.push({
        period: '逾期 1-30 天',
        rate: '1%',
        legalBasis: '稅捐稽徵法第20條'
      });
    }
    if (penaltyCount >= 2) {
      totalPenaltyRate = totalPenaltyRate.plus(this.LATE_PAYMENT_RATES.second);
      penaltyDetails.push({
        period: '逾期 31-60 天',
        rate: '2%',
        legalBasis: '稅捐稽徵法第20條'
      });
    }
    if (penaltyCount >= 3) {
      totalPenaltyRate = totalPenaltyRate.plus(this.LATE_PAYMENT_RATES.third);
      penaltyDetails.push({
        period: '逾期 61-90 天',
        rate: '3%',
        legalBasis: '稅捐稽徵法第20條'
      });
    }

    const latePenalty = tax.times(totalPenaltyRate);
    const totalAmount = tax.plus(latePenalty);

    return {
      taxAmount: tax.toNumber(),
      dueDate: due.toISOString().split('T')[0],
      paymentDate: payment.toISOString().split('T')[0],
      overdueDays,
      penaltyCount,
      totalPenaltyRate: totalPenaltyRate.times(100).toNumber(),
      latePenalty: latePenalty.toNumber(),
      totalAmount: totalAmount.toNumber(),
      penaltyDetails,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算滯納利息（按日計息）
   * @param {Object} params - 計算參數
   * @param {number} params.taxAmount - 應納稅額
   * @param {number} params.days - 滯納天數
   * @param {number} params.annualRate - 年利率（%，預設 3.65%）
   * @returns {Object} 計算結果
   */
  calculateDailyInterest(params) {
    const {
      taxAmount,
      days,
      annualRate = 3.65
    } = params;

    if (!taxAmount || taxAmount <= 0) {
      throw new Error('應納稅額必須為正數');
    }
    if (!days || days < 0) {
      throw new Error('滯納天數必須為非負整數');
    }

    const tax = new Decimal(taxAmount);
    const rate = new Decimal(annualRate).dividedBy(365).dividedBy(100); // 日利率
    const interest = tax.times(rate).times(days);

    return {
      taxAmount: tax.toNumber(),
      days,
      annualRate,
      dailyRate: rate.times(100).toNumber(),
      interest: interest.toNumber(),
      totalAmount: tax.plus(interest).toNumber(),
      legalBasis: '稅捐稽徵法第20條',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算怠報金
   * @param {Object} params - 計算參數
   * @param {string} params.violationType - 違規類型 (minor|major)
   * @param {number} params.taxAmount - 應納稅額（選填）
   * @returns {Object} 計算結果
   */
  calculateFailureToFilePenalty(params) {
    const {
      violationType = 'minor',
      taxAmount = 0
    } = params;

    let penalty;
    let description;

    if (violationType === 'minor') {
      // 輕微違規：固定罰鍰
      penalty = this.FAILURE_TO_FILE_PENALTY.min;
      description = '未依限申報（輕微）';
    } else {
      // 重大違規：依應納稅額計算
      if (taxAmount > 0) {
        const tax = new Decimal(taxAmount);
        const calculated = tax.times(0.1); // 10% 罰鍰
        
        // 最低 1,500、最高 15,000
        penalty = Math.max(
          this.FAILURE_TO_FILE_PENALTY.min,
          Math.min(calculated.toNumber(), this.FAILURE_TO_FILE_PENALTY.max)
        );
        description = '未依限申報（重大）';
      } else {
        penalty = this.FAILURE_TO_FILE_PENALTY.max;
        description = '未依限申報（無應納稅額）';
      }
    }

    return {
      violationType,
      taxAmount,
      penalty,
      description,
      legalBasis: '稅捐稽徵法第21條',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算短報漏報罰鍰
   * @param {Object} params - 計算參數
   * @param {number} params.underreportedAmount - 短漏報金額
   * @param {boolean} params.intentional - 是否故意（預設 false）
   * @returns {Object} 計算結果
   */
  calculateUnderreportPenalty(params) {
    const {
      underreportedAmount,
      intentional = false
    } = params;

    if (!underreportedAmount || underreportedAmount <= 0) {
      throw new Error('短漏報金額必須為正數');
    }

    const amount = new Decimal(underreportedAmount);
    let penaltyRate;
    let description;

    if (intentional) {
      // 故意短漏報：2-3 倍罰鍰
      penaltyRate = new Decimal(2);
      description = '故意短漏報所得額';
    } else {
      // 過失短漏報：0.2-1 倍罰鍰
      penaltyRate = new Decimal(0.5);
      description = '過失短漏報所得額';
    }

    const penalty = amount.times(penaltyRate);

    return {
      underreportedAmount: amount.toNumber(),
      intentional,
      penaltyRate: penaltyRate.toNumber(),
      penalty: penalty.toNumber(),
      description,
      legalBasis: '所得稅法第110條',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 綜合計算（滯納金 + 利息 + 罰鍰）
   * @param {Object} params - 計算參數
   * @returns {Object} 完整計算結果
   */
  calculateComplete(params) {
    const results = {};
    let totalPenalty = new Decimal(0);

    // 1. 滯納金
    if (params.dueDate) {
      results.latePenalty = this.calculateLatePenalty({
        taxAmount: params.taxAmount,
        dueDate: params.dueDate,
        paymentDate: params.paymentDate
      });
      totalPenalty = totalPenalty.plus(results.latePenalty.latePenalty);
    }

    // 2. 滯納利息
    if (params.days) {
      results.interest = this.calculateDailyInterest({
        taxAmount: params.taxAmount,
        days: params.days,
        annualRate: params.annualRate
      });
      totalPenalty = totalPenalty.plus(results.interest.interest);
    }

    // 3. 怠報金
    if (params.failureToFile) {
      results.failureToFile = this.calculateFailureToFilePenalty({
        violationType: params.violationType,
        taxAmount: params.taxAmount
      });
      totalPenalty = totalPenalty.plus(results.failureToFile.penalty);
    }

    // 4. 短漏報罰鍰
    if (params.underreportedAmount) {
      results.underreport = this.calculateUnderreportPenalty({
        underreportedAmount: params.underreportedAmount,
        intentional: params.intentional
      });
      totalPenalty = totalPenalty.plus(results.underreport.penalty);
    }

    const originalTax = new Decimal(params.taxAmount || 0);
    results.summary = {
      originalTax: originalTax.toNumber(),
      totalPenalty: totalPenalty.toNumber(),
      totalAmount: originalTax.plus(totalPenalty).toNumber(),
      calculatedAt: new Date().toISOString()
    };

    return results;
  }
}

export default PenaltyEngine;
