/**
 * 預設稅務規則庫 - 2025 年度
 * 包含：扣繳、綜所稅、營所稅、二代健保、滯納金等規則
 */

export const DEFAULT_RULES_2025 = {
  // 扣繳稅額規則
  withholding: [
    {
      id: 'wh_salary_resident_2025',
      type: 'WITHHOLDING',
      category: '薪資所得',
      name: '本國居民薪資扣繳',
      year: 2025,
      conditions: {
        residency: 'resident',
        incomeType: 'salary',
        threshold: 88501
      },
      calculation: {
        method: 'progressive',
        brackets: [
          { min: 0, max: 88500, rate: 0 },
          { min: 88501, max: Infinity, rate: 0.05 }
        ]
      },
      legalBasis: '所得稅法第88條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'wh_salary_nonresident_2025',
      type: 'WITHHOLDING',
      category: '薪資所得',
      name: '非居民薪資扣繳',
      year: 2025,
      conditions: {
        residency: 'non-resident',
        incomeType: 'salary'
      },
      calculation: {
        method: 'flat',
        rate: 0.18
      },
      legalBasis: '所得稅法第88條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'wh_professional_2025',
      type: 'WITHHOLDING',
      category: '執行業務所得',
      name: '執行業務所得扣繳（無扣繳憑單）',
      year: 2025,
      conditions: {
        incomeType: 'professional',
        hasCertificate: false
      },
      calculation: {
        method: 'flat',
        rate: 0.10
      },
      legalBasis: '所得稅法第88條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'wh_rent_2025',
      type: 'WITHHOLDING',
      category: '租賃所得',
      name: '租賃所得扣繳',
      year: 2025,
      conditions: {
        incomeType: 'rent',
        threshold: 20000
      },
      calculation: {
        method: 'flat',
        rate: 0.10
      },
      legalBasis: '所得稅法第88條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'wh_interest_2025',
      type: 'WITHHOLDING',
      category: '利息所得',
      name: '利息所得扣繳',
      year: 2025,
      conditions: {
        incomeType: 'interest',
        threshold: 20000
      },
      calculation: {
        method: 'flat',
        rate: 0.10
      },
      legalBasis: '所得稅法第88條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    }
  ],

  // 綜合所得稅規則
  pit: [
    {
      id: 'pit_brackets_2025',
      type: 'PIT',
      category: '綜合所得稅',
      name: '綜所稅累進稅率',
      year: 2025,
      calculation: {
        method: 'progressive',
        brackets: [
          { min: 0, max: 590000, rate: 0.05, deduction: 0 },
          { min: 590001, max: 1330000, rate: 0.12, deduction: 41300 },
          { min: 1330001, max: 2660000, rate: 0.20, deduction: 147700 },
          { min: 2660001, max: 4980000, rate: 0.30, deduction: 413700 },
          { min: 4980001, max: Infinity, rate: 0.40, deduction: 911700 }
        ]
      },
      legalBasis: '所得稅法第5條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'pit_exemption_2025',
      type: 'PIT',
      category: '免稅額',
      name: '個人免稅額',
      year: 2025,
      calculation: {
        standard: 97000,
        senior: 145500 // 70歲以上
      },
      legalBasis: '所得稅法第17條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'pit_standard_deduction_2025',
      type: 'PIT',
      category: '標準扣除額',
      name: '標準扣除額',
      year: 2025,
      calculation: {
        single: 131000,
        married: 262000
      },
      legalBasis: '所得稅法第17條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'pit_salary_deduction_2025',
      type: 'PIT',
      category: '薪資特別扣除額',
      name: '薪資所得特別扣除額',
      year: 2025,
      calculation: {
        amount: 218000
      },
      legalBasis: '所得稅法第17條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    }
  ],

  // 營利事業所得稅規則
  cit: [
    {
      id: 'cit_standard_2025',
      type: 'CIT',
      category: '營利事業所得稅',
      name: '營所稅標準稅率',
      year: 2025,
      calculation: {
        method: 'flat',
        rate: 0.20
      },
      legalBasis: '所得稅法第5條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'cit_small_business_2025',
      type: 'CIT',
      category: '小規模營利事業',
      name: '小規模營利事業免稅額',
      year: 2025,
      conditions: {
        threshold: 120000
      },
      calculation: {
        method: 'exempt',
        exemptAmount: 120000
      },
      legalBasis: '所得稅法第71條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'cit_retained_earnings_2025',
      type: 'CIT',
      category: '未分配盈餘',
      name: '未分配盈餘加徵',
      year: 2025,
      calculation: {
        method: 'flat',
        rate: 0.05
      },
      legalBasis: '所得稅法第66條之9',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'cit_amt_2025',
      type: 'CIT',
      category: '最低稅負',
      name: '營利事業最低稅負（AMT）',
      year: 2025,
      calculation: {
        method: 'amt',
        rate: 0.12,
        exemption: 500000
      },
      legalBasis: '所得基本稅額條例第7條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    }
  ],

  // 二代健保規則
  nhi2: [
    {
      id: 'nhi2_standard_2025',
      type: 'NHI2',
      category: '二代健保',
      name: '補充保費標準',
      year: 2025,
      calculation: {
        rate: 0.0225,
        threshold: 20000,
        ceiling: 10000000
      },
      applicableIncome: [
        '高額獎金',
        '兼職所得',
        '執行業務收入',
        '股利所得',
        '利息所得',
        '租金收入'
      ],
      legalBasis: '二代健保補充保險費扣取及繳納辦法',
      effectiveDate: '2025-01-01',
      version: '1.0'
    }
  ],

  // 滯納金規則
  penalty: [
    {
      id: 'penalty_late_payment_2025',
      type: 'PENALTY',
      category: '滯納金',
      name: '稅款逾期加徵',
      year: 2025,
      calculation: {
        method: 'progressive',
        periods: [
          { days: 30, rate: 0.01, description: '逾期1-30天加徵1%' },
          { days: 60, rate: 0.02, description: '逾期31-60天再加徵2%' },
          { days: 90, rate: 0.03, description: '逾期61-90天再加徵3%' }
        ],
        maxRate: 0.06
      },
      legalBasis: '稅捐稽徵法第20條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'penalty_interest_2025',
      type: 'PENALTY',
      category: '滯納利息',
      name: '按日加計利息',
      year: 2025,
      calculation: {
        method: 'daily',
        annualRate: 0.0365 // 年利率 3.65%
      },
      legalBasis: '稅捐稽徵法第20條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'penalty_failure_to_file_2025',
      type: 'PENALTY',
      category: '怠報金',
      name: '未依限申報罰鍰',
      year: 2025,
      calculation: {
        method: 'range',
        min: 1500,
        max: 15000,
        baseRate: 0.10
      },
      legalBasis: '稅捐稽徵法第21條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    },
    {
      id: 'penalty_underreport_2025',
      type: 'PENALTY',
      category: '短漏報罰鍰',
      name: '短漏報所得額罰鍰',
      year: 2025,
      calculation: {
        method: 'multiplier',
        intentional: { min: 2, max: 3 },
        negligent: { min: 0.2, max: 1 }
      },
      legalBasis: '所得稅法第110條',
      effectiveDate: '2025-01-01',
      version: '1.0'
    }
  ]
};

/**
 * 初始化規則庫
 * @param {RuleRepository} ruleRepository - 規則倉儲
 */
export async function initializeDefaultRules(ruleRepository) {
  try {
    // 檢查是否已初始化
    const existingRules = await ruleRepository.getAll();
    if (existingRules && existingRules.length > 0) {
      console.log('規則庫已初始化，跳過預載');
      return { success: true, message: '規則庫已存在', count: existingRules.length };
    }

    let totalCount = 0;

    // 批量插入扣繳規則
    for (const rule of DEFAULT_RULES_2025.withholding) {
      await ruleRepository.create(rule);
      totalCount++;
    }

    // 批量插入綜所稅規則
    for (const rule of DEFAULT_RULES_2025.pit) {
      await ruleRepository.create(rule);
      totalCount++;
    }

    // 批量插入營所稅規則
    for (const rule of DEFAULT_RULES_2025.cit) {
      await ruleRepository.create(rule);
      totalCount++;
    }

    // 批量插入二代健保規則
    for (const rule of DEFAULT_RULES_2025.nhi2) {
      await ruleRepository.create(rule);
      totalCount++;
    }

    // 批量插入滯納金規則
    for (const rule of DEFAULT_RULES_2025.penalty) {
      await ruleRepository.create(rule);
      totalCount++;
    }

    console.log(`成功預載 ${totalCount} 條規則`);
    return { success: true, message: '規則庫初始化完成', count: totalCount };

  } catch (error) {
    console.error('規則庫初始化失敗:', error);
    return { success: false, message: error.message };
  }
}

export default DEFAULT_RULES_2025;
