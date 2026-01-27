/**
 * 案件倉儲
 * 管理案件的 CRUD 操作
 */

import { BaseRepository } from './BaseRepository.js';

export class CaseRepository extends BaseRepository {
  constructor() {
    super('cases');
  }

  /**
   * 根據客戶 ID 查找案件
   */
  async findByClientId(clientId) {
    return await this.table
      .where('clientId')
      .equals(clientId)
      .reverse()
      .sortBy('year');
  }

  /**
   * 根據年度和類型查找
   */
  async findByYearAndType(year, type) {
    return await this.table
      .where({ year, type })
      .toArray();
  }

  /**
   * 根據狀態查找
   */
  async findByStatus(status) {
    return await this.table
      .where('status')
      .equals(status)
      .sortBy('updatedAt');
  }

  /**
   * 更新案件狀態
   */
  async updateStatus(id, status) {
    return await this.update(id, { status });
  }

  /**
   * 獲取統計數據
   */
  async getStatistics() {
    const allCases = await this.findAll();
    
    const stats = {
      total: allCases.length,
      byStatus: {},
      byType: {},
      byYear: {}
    };
    
    allCases.forEach(c => {
      // 按狀態統計
      stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1;
      
      // 按類型統計
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
      
      // 按年度統計
      stats.byYear[c.year] = (stats.byYear[c.year] || 0) + 1;
    });
    
    return stats;
  }
}

export default CaseRepository;
