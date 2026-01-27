/**
 * 綜合所得稅計算引擎（2025年度）
 */

import { TaxCalculator } from '../../utils/decimal.js';

export class PITEngine {
  // 2025年度稅率級距
  static TAX_BRACKETS = [
    { limit: 610000, rate: 0.05, deduction: 0 },
    { limit: 1380000, rate: 0.12, deduction: 42700 },
    { limit: 2770000, rate: 0.20, deduction: 153100 },
    { limit: 5190000, rate: 0.30, deduction: 430100 },
    { limit: Infinity, rate: 0.40, deduction: 949100 }
  ];

  // 免稅額
  static EXEMPTIONS = {
    GENERAL: 97000,
    SENIOR: 145500
  };

  // 扣除額
  static DEDUCTIONS = {
    STANDARD_SINGLE: 131000,
    STANDARD_MARRIED: 262000,
    SALARY: 218000,
    SAVINGS: 270000,
    DISABILITY: 218000,
    EDUCATION: 25000,
    CHILDCARE_FIRST: 150000,
    CHILDCARE_SECOND: 225000,
    LONGTERM_CARE: 180000,
    RENT: 180000
  };

  /**
   * 計算綜合所得稅
   */
  static calculate(params) {
    const {
      totalIncome,
      exemptionCount = 1,
      seniorCount = 0,
      useStandardDeduction = true,
      itemizedDeductions = 0,
      specialDeductions = {}
    } = params;

    // Step 1: 計算免稅額
    const exemptionAmount = this._calculateExemptions(exemptionCount, seniorCount);

    // Step 2: 計算扣除額
    const deductionAmount = useStandardDeduction
      ? this.DEDUCTIONS.STANDARD_SINGLE
      : itemizedDeductions;

    // Step 3: 計算特別扣除額
    const specialDeductionAmount = this._calculateSpecialDeductions(specialDeductions);

    // Step 4: 計算課稅所得淨額
    const taxableIncome = Math.max(0,
      totalIncome - exemptionAmount - deductionAmount - specialDeductionAmount
    );

    // Step 5: 計算稅額
    const taxAmount = this._calculateTaxByBracket(taxableIncome);

    return {
      success: true,
      totalIncome,
      exemptionAmount,
      deductionAmount,
      specialDeductionAmount,
      taxableIncome,
      taxAmount,
      effectiveRate: taxAmount / totalIncome,
      legalBasis: '所得稅法第5條、第17條'
    };
  }

  static _calculateExemptions(count, seniorCount) {
    const general = (count - seniorCount) * this.EXEMPTIONS.GENERAL;
    const senior = seniorCount * this.EXEMPTIONS.SENIOR;
    return general + senior;
  }

  static _calculateSpecialDeductions(deductions) {
    let total = 0;
    if (deductions.salary) total += this.DEDUCTIONS.SALARY;
    if (deductions.savings) total += Math.min(deductions.savingsAmount || 0, this.DEDUCTIONS.SAVINGS);
    if (deductions.disability) total += deductions.disabilityCount * this.DEDUCTIONS.DISABILITY;
    if (deductions.childcare) total += deductions.childcareAmount || 0;
    if (deductions.longtermCare) total += deductions.longtermCareCount * this.DEDUCTIONS.LONGTERM_CARE;
    if (deductions.rent) total += Math.min(deductions.rentAmount || 0, this.DEDUCTIONS.RENT);
    return total;
  }

  static _calculateTaxByBracket(income) {
    for (const bracket of this.TAX_BRACKETS) {
      if (income <= bracket.limit) {
        return TaxCalculator.quickTaxFormula(income, bracket.rate, bracket.deduction);
      }
    }
    return 0;
  }
}

export default PITEngine;
