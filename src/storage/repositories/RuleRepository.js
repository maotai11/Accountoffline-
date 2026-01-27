/**
 * 規則倉儲
 * 管理規則卡的 CRUD 操作
 */

import { BaseRepository } from './BaseRepository.js';

export class RuleRepository extends BaseRepository {
  constructor() {
    super('rules');
  }

  /**
   * 根據規則 ID 查找
   */
  async findByRuleId(ruleId) {
    return await this.table.where('ruleId').equals(ruleId).first();
  }

  /**
   * 根據類別查找活躍規則
   */
  async findActiveByCategory(category) {
    return await this.table
      .where({ category, isActive: true })
      .sortBy('version');
  }

  /**
   * 查找特定日期有效的規則
   */
  async findEffectiveRules(category, effectiveDate) {
    const allRules = await this.findActiveByCategory(category);
    return allRules.filter(rule => {
      const ruleDate = new Date(rule.effectiveDate);
      const targetDate = new Date(effectiveDate);
      return ruleDate <= targetDate;
    });
  }

  /**
   * 停用規則
   */
  async deactivate(id) {
    return await this.update(id, { isActive: false });
  }

  /**
   * 啟用規則
   */
  async activate(id) {
    return await this.update(id, { isActive: true });
  }

  /**
   * 查找規則版本歷史
   */
  async findVersionHistory(ruleId) {
    return await this.table
      .where('ruleId')
      .equals(ruleId)
      .reverse()
      .sortBy('version');
  }

  /**
   * 檢查規則衝突
   */
  async checkConflicts(newRule) {
    const existingRules = await this.findActiveByCategory(newRule.category);
    
    const conflicts = existingRules.filter(rule => {
      // 檢查條件重疊
      return this._hasConditionOverlap(rule.conditions, newRule.conditions);
    });
    
    return conflicts;
  }

  /**
   * 私有方法：檢查條件重疊
   */
  _hasConditionOverlap(conditions1, conditions2) {
    const keys1 = Object.keys(conditions1);
    const keys2 = Object.keys(conditions2);
    
    // 找出共同的鍵
    const commonKeys = keys1.filter(key => keys2.includes(key));
    
    // 檢查共同鍵的值是否相同
    return commonKeys.every(key => conditions1[key] === conditions2[key]);
  }
}

export default RuleRepository;
