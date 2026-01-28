/**
 * 基礎倉儲類
 * 提供通用 CRUD 操作
 */

import db from '../database.js';

export class BaseRepository {
  constructor(tableName) {
    this.table = db[tableName];
    this.tableName = tableName;
  }

  /**
   * 創建記錄
   */
  async create(data) {
    const timestamp = new Date().toISOString();
    const record = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    const id = await this.table.add(record);
    return this.findById(id);
  }

  /**
   * 批量創建
   */
  async bulkCreate(dataArray) {
    const timestamp = new Date().toISOString();
    const records = dataArray.map(data => ({
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    
    const ids = await this.table.bulkAdd(records, { allKeys: true });
    return this.findByIds(ids);
  }

  /**
   * 根據 ID 查找
   */
  async findById(id) {
    return await this.table.get(id);
  }

  /**
   * 根據多個 ID 查找
   */
  async findByIds(ids) {
    return await this.table.where('id').anyOf(ids).toArray();
  }

  /**
   * 查找所有記錄
   */
  async findAll(options = {}) {
    let query = this.table.toCollection();
    
    // 排序
    if (options.orderBy) {
      query = this.table.orderBy(options.orderBy);
      if (options.reverse) {
        query = query.reverse();
      }
    }
    
    // 限制數量
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    // 偏移
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    return await query.toArray();
  }

  /**
   * 條件查詢
   */
  async findWhere(conditions) {
    return await this.table.where(conditions).toArray();
  }

  /**
   * 更新記錄
   */
  async update(id, updates) {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`記錄不存在: ID ${id}`);
    }
    
    await this.table.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return this.findById(id);
  }

  /**
   * 刪除記錄
   */
  async delete(id) {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`記錄不存在: ID ${id}`);
    }
    
    await this.table.delete(id);
    return record;
  }

  /**
   * 批量刪除
   */
  async bulkDelete(ids) {
    return await this.table.bulkDelete(ids);
  }

  /**
   * 計數
   */
  async count(conditions = {}) {
    if (Object.keys(conditions).length === 0) {
      return await this.table.count();
    }
    return await this.table.where(conditions).count();
  }

  /**
   * 清空表
   */
  async clear() {
    return await this.table.clear();
  }
}

export default BaseRepository;
