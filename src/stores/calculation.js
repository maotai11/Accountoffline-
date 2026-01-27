/**
 * 計算模塊 Pinia Store
 * 管理所有稅務計算的狀態
 */

import { defineStore } from 'pinia';
import { WithholdingEngine } from '../core/engines/calculation/WithholdingEngine.js';
import { PITEngine } from '../core/engines/calculation/PITEngine.js';
import { CITEngine } from '../core/engines/calculation/CITEngine.js';
import { NHI2Engine } from '../core/engines/calculation/NHI2Engine.js';
import { PenaltyEngine } from '../core/engines/calculation/PenaltyEngine.js';
import { db } from '../storage/database.js';

export const useCalculationStore = defineStore('calculation', {
  state: () => ({
    // 計算引擎實例
    engines: {
      withholding: null,
      pit: null,
      cit: null,
      nhi2: null,
      penalty: null
    },

    // 當前計算結果
    currentResults: {
      withholding: null,
      pit: null,
      cit: null,
      nhi2: null,
      penalty: null
    },

    // 計算歷史記錄
    calculationHistory: [],

    // 載入狀態
    loading: false,
    
    // 錯誤訊息
    error: null
  }),

  getters: {
    /**
     * 取得最近的計算記錄
     */
    recentCalculations: (state) => {
      return state.calculationHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    },

    /**
     * 按類型取得計算記錄
     */
    getCalculationsByType: (state) => (type) => {
      return state.calculationHistory.filter(calc => calc.type === type);
    },

    /**
     * 檢查引擎是否已初始化
     */
    isEngineReady: (state) => (engineName) => {
      return state.engines[engineName] !== null;
    }
  },

  actions: {
    /**
     * 初始化所有計算引擎
     */
    async initializeEngines() {
      try {
        this.loading = true;
        this.error = null;

        // 從數據庫載入規則倉儲
        const ruleRepository = db.rules;

        // 初始化各引擎
        this.engines.withholding = new WithholdingEngine(ruleRepository);
        this.engines.pit = new PITEngine(ruleRepository);
        this.engines.cit = new CITEngine(ruleRepository);
        this.engines.nhi2 = new NHI2Engine(ruleRepository);
        this.engines.penalty = new PenaltyEngine();

        console.log('所有計算引擎初始化完成');
        return { success: true };

      } catch (error) {
        this.error = `引擎初始化失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 計算扣繳稅額
     */
    async calculateWithholding(params) {
      try {
        this.loading = true;
        this.error = null;

        if (!this.engines.withholding) {
          await this.initializeEngines();
        }

        const result = await this.engines.withholding.calculate(params);
        this.currentResults.withholding = result;

        // 儲存到歷史記錄
        await this.saveCalculationHistory({
          type: 'withholding',
          params,
          result,
          timestamp: new Date().toISOString()
        });

        return { success: true, result };

      } catch (error) {
        this.error = `扣繳計算失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 計算綜合所得稅
     */
    async calculatePIT(params) {
      try {
        this.loading = true;
        this.error = null;

        if (!this.engines.pit) {
          await this.initializeEngines();
        }

        const result = await this.engines.pit.calculate(params);
        this.currentResults.pit = result;

        await this.saveCalculationHistory({
          type: 'pit',
          params,
          result,
          timestamp: new Date().toISOString()
        });

        return { success: true, result };

      } catch (error) {
        this.error = `綜所稅計算失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 計算營利事業所得稅
     */
    async calculateCIT(params) {
      try {
        this.loading = true;
        this.error = null;

        if (!this.engines.cit) {
          await this.initializeEngines();
        }

        const result = await this.engines.cit.calculateCIT(params);
        this.currentResults.cit = result;

        await this.saveCalculationHistory({
          type: 'cit',
          params,
          result,
          timestamp: new Date().toISOString()
        });

        return { success: true, result };

      } catch (error) {
        this.error = `營所稅計算失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 計算二代健保
     */
    async calculateNHI2(params) {
      try {
        this.loading = true;
        this.error = null;

        if (!this.engines.nhi2) {
          await this.initializeEngines();
        }

        const result = await this.engines.nhi2.calculate(params);
        this.currentResults.nhi2 = result;

        await this.saveCalculationHistory({
          type: 'nhi2',
          params,
          result,
          timestamp: new Date().toISOString()
        });

        return { success: true, result };

      } catch (error) {
        this.error = `二代健保計算失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 計算滯納金
     */
    async calculatePenalty(params) {
      try {
        this.loading = true;
        this.error = null;

        if (!this.engines.penalty) {
          await this.initializeEngines();
        }

        let result;
        if (params.calculationType === 'late') {
          result = this.engines.penalty.calculateLatePenalty(params);
        } else if (params.calculationType === 'interest') {
          result = this.engines.penalty.calculateDailyInterest(params);
        } else if (params.calculationType === 'complete') {
          result = this.engines.penalty.calculateComplete(params);
        } else {
          throw new Error('未知的計算類型');
        }

        this.currentResults.penalty = result;

        await this.saveCalculationHistory({
          type: 'penalty',
          params,
          result,
          timestamp: new Date().toISOString()
        });

        return { success: true, result };

      } catch (error) {
        this.error = `滯納金計算失敗: ${error.message}`;
        console.error(this.error, error);
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 儲存計算歷史到 IndexedDB
     */
    async saveCalculationHistory(record) {
      try {
        await db.calculations.add(record);
        this.calculationHistory.unshift(record);
        
        // 保留最近 100 筆記錄
        if (this.calculationHistory.length > 100) {
          this.calculationHistory = this.calculationHistory.slice(0, 100);
        }

      } catch (error) {
        console.error('儲存計算歷史失敗:', error);
      }
    },

    /**
     * 從數據庫載入計算歷史
     */
    async loadCalculationHistory() {
      try {
        const records = await db.calculations
          .orderBy('timestamp')
          .reverse()
          .limit(100)
          .toArray();
        
        this.calculationHistory = records;
        return { success: true, count: records.length };

      } catch (error) {
        console.error('載入計算歷史失敗:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * 清除當前計算結果
     */
    clearCurrentResults(type = null) {
      if (type) {
        this.currentResults[type] = null;
      } else {
        this.currentResults = {
          withholding: null,
          pit: null,
          cit: null,
          nhi2: null,
          penalty: null
        };
      }
    },

    /**
     * 清除錯誤訊息
     */
    clearError() {
      this.error = null;
    },

    /**
     * 刪除計算記錄
     */
    async deleteCalculationRecord(id) {
      try {
        await db.calculations.delete(id);
        this.calculationHistory = this.calculationHistory.filter(
          record => record.id !== id
        );
        return { success: true };

      } catch (error) {
        console.error('刪除計算記錄失敗:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * 清空所有計算歷史
     */
    async clearAllHistory() {
      try {
        await db.calculations.clear();
        this.calculationHistory = [];
        return { success: true };

      } catch (error) {
        console.error('清空計算歷史失敗:', error);
        return { success: false, error: error.message };
      }
    }
  }
});

export default useCalculationStore;
