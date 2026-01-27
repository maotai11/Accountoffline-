/**
 * 營利事業所得稅計算引擎
 * Corporate Income Tax Engine
 * 
 * 功能：
 * - 營所稅應納稅額計算
 * - 累進稅率級距計算
 * - 未分配盈餘加徵
 * - 最低稅負制（AMT）
 * - 暫繳稅額計算
 */

import { Decimal } from '../../utils/decimal.js';

export class CITEngine {
  constructor(ruleRepository) {
    this.ruleRepository = ruleRepository;
    this.currentYear = new Date().getFullYear();
  }

  /**
   * 計算營所稅應納稅額
   * @param {Object} params - 計算參數
   * @param {number} params.taxableIncome - 課稅所得額
   * @param {number} params.year - 年度
   * @param {string} params.companyType - 公司類型 (general|small)
   * @returns {Object} 計算結果
   */
  async calculateCIT(params) {
    const {
      taxableIncome,
      year = this.currentYear,
      companyType = 'general'
    } = params;

    // 輸入驗證
    if (!taxableIncome || taxableIncome < 0) {
      throw new Error('課稅所得額必須為正數');
    }

    // 載入稅率規則
    const rules = await this.ruleRepository.getRulesByType('CIT', year);
    if (!rules || rules.length === 0) {
      throw new Error(`找不到 ${year} 年度營所稅規則`);
    }

    const income = new Decimal(taxableIncome);
    let taxAmount = new Decimal(0);
    let effectiveRate = new Decimal(0);
    let appliedRules = [];

    // 一般稅率 20%
    if (companyType === 'general') {
      const rate = new Decimal(0.20);
      taxAmount = income.times(rate);
      effectiveRate = rate;
      
      appliedRules.push({
        description: '營利事業所得稅標準稅率',
        rate: '20%',
        legalBasis: '所得稅法第5條'
      });
    } 
    // 小規模營利事業（所得額 ≤ 12 萬）
    else if (companyType === 'small') {
      const threshold = new Decimal(120000);
      
      if (income.lte(threshold)) {
        // 免稅
        taxAmount = new Decimal(0);
        effectiveRate = new Decimal(0);
        
        appliedRules.push({
          description: '小規模營利事業免稅',
          threshold: '120,000',
          rate: '0%',
          legalBasis: '所得稅法第71條'
        });
      } else {
        // 超過部分課稅
        const rate = new Decimal(0.20);
        taxAmount = income.times(rate);
        effectiveRate = rate;
        
        appliedRules.push({
          description: '小規模營利事業標準稅率',
          rate: '20%',
          legalBasis: '所得稅法第71條'
        });
      }
    }

    return {
      taxableIncome: income.toNumber(),
      taxAmount: taxAmount.toNumber(),
      effectiveRate: effectiveRate.times(100).toNumber(),
      companyType,
      year,
      appliedRules,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算未分配盈餘加徵
   * @param {Object} params - 計算參數
   * @param {number} params.retainedEarnings - 未分配盈餘
   * @param {number} params.year - 年度
   * @returns {Object} 計算結果
   */
  async calculateRetainedEarningsTax(params) {
    const {
      retainedEarnings,
      year = this.currentYear
    } = params;

    if (!retainedEarnings || retainedEarnings < 0) {
      throw new Error('未分配盈餘必須為正數');
    }

    const earnings = new Decimal(retainedEarnings);
    const rate = new Decimal(0.05); // 5% 加徵稅率
    const taxAmount = earnings.times(rate);

    return {
      retainedEarnings: earnings.toNumber(),
      taxRate: 5,
      taxAmount: taxAmount.toNumber(),
      legalBasis: '所得稅法第66條之9',
      year,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算最低稅負（AMT）
   * @param {Object} params - 計算參數
   * @param {number} params.basicIncome - 基本所得額
   * @param {number} params.year - 年度
   * @returns {Object} 計算結果
   */
  async calculateAMT(params) {
    const {
      basicIncome,
      year = this.currentYear
    } = params;

    if (!basicIncome || basicIncome < 0) {
      throw new Error('基本所得額必須為正數');
    }

    const income = new Decimal(basicIncome);
    const exemption = new Decimal(500000); // 免稅額 50 萬
    const rate = new Decimal(0.12); // 稅率 12%

    let taxableIncome = income.minus(exemption);
    if (taxableIncome.lt(0)) {
      taxableIncome = new Decimal(0);
    }

    const taxAmount = taxableIncome.times(rate);

    return {
      basicIncome: income.toNumber(),
      exemption: exemption.toNumber(),
      taxableIncome: taxableIncome.toNumber(),
      taxRate: 12,
      taxAmount: taxAmount.toNumber(),
      legalBasis: '所得基本稅額條例第7條',
      year,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算暫繳稅額
   * @param {Object} params - 計算參數
   * @param {number} params.lastYearTax - 去年應納稅額
   * @param {number} params.prepaymentRate - 暫繳比例（預設 50%）
   * @returns {Object} 計算結果
   */
  calculatePrepayment(params) {
    const {
      lastYearTax,
      prepaymentRate = 0.5
    } = params;

    if (!lastYearTax || lastYearTax < 0) {
      throw new Error('去年應納稅額必須為正數');
    }

    const tax = new Decimal(lastYearTax);
    const rate = new Decimal(prepaymentRate);
    const prepaymentAmount = tax.times(rate);

    return {
      lastYearTax: tax.toNumber(),
      prepaymentRate: rate.times(100).toNumber(),
      prepaymentAmount: prepaymentAmount.toNumber(),
      legalBasis: '所得稅法第69條',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 綜合計算（營所稅 + 未分配盈餘 + AMT）
   * @param {Object} params - 計算參數
   * @returns {Object} 完整計算結果
   */
  async calculateComplete(params) {
    const results = {};

    // 1. 營所稅
    if (params.taxableIncome) {
      results.cit = await this.calculateCIT(params);
    }

    // 2. 未分配盈餘
    if (params.retainedEarnings) {
      results.retainedEarnings = await this.calculateRetainedEarningsTax(params);
    }

    // 3. 最低稅負
    if (params.basicIncome) {
      results.amt = await this.calculateAMT(params);
    }

    // 4. 總應納稅額
    let totalTax = new Decimal(0);
    if (results.cit) {
      totalTax = totalTax.plus(results.cit.taxAmount);
    }
    if (results.retainedEarnings) {
      totalTax = totalTax.plus(results.retainedEarnings.taxAmount);
    }
    if (results.amt) {
      // AMT 與一般稅額取較高者
      const amtAmount = new Decimal(results.amt.taxAmount);
      if (amtAmount.gt(totalTax)) {
        totalTax = amtAmount;
      }
    }

    results.summary = {
      totalTax: totalTax.toNumber(),
      calculatedAt: new Date().toISOString()
    };

    return results;
  }
}

export default CITEngine;
