<template>
  <div class="calculator-card">
    <div class="calculator-header">
      <h3><i class="pi pi-exclamation-triangle"></i> 滯納金計算器</h3>
      <p class="text-muted">計算逾期繳納稅款的滯納金與利息</p>
    </div>

    <div class="calculator-body">
      <form @submit.prevent="handleCalculate" class="calculation-form">
        <!-- 計算類型 -->
        <div class="form-group">
          <label for="calculationType" class="required">計算類型</label>
          <select 
            id="calculationType" 
            v-model="formData.calculationType" 
            class="form-control"
            required
          >
            <option value="late">滯納金（按月加徵）</option>
            <option value="interest">滯納利息（按日計息）</option>
            <option value="complete">完整計算（滯納金+利息）</option>
          </select>
        </div>

        <!-- 應納稅額 -->
        <div class="form-group">
          <label for="taxAmount" class="required">應納稅額</label>
          <input 
            id="taxAmount"
            type="number" 
            v-model.number="formData.taxAmount" 
            class="form-control"
            placeholder="原始應納稅額"
            min="0"
            required
          />
        </div>

        <!-- 繳納期限 -->
        <div class="form-group" v-if="formData.calculationType === 'late' || formData.calculationType === 'complete'">
          <label for="dueDate" class="required">繳納期限</label>
          <input 
            id="dueDate"
            type="date" 
            v-model="formData.dueDate" 
            class="form-control"
            required
          />
        </div>

        <!-- 實際繳納日期 -->
        <div class="form-group" v-if="formData.calculationType === 'late' || formData.calculationType === 'complete'">
          <label for="paymentDate">實際繳納日期</label>
          <input 
            id="paymentDate"
            type="date" 
            v-model="formData.paymentDate" 
            class="form-control"
          />
          <small class="form-text">留空則使用今日</small>
        </div>

        <!-- 滯納天數 -->
        <div class="form-group" v-if="formData.calculationType === 'interest' || formData.calculationType === 'complete'">
          <label for="days" class="required">滯納天數</label>
          <input 
            id="days"
            type="number" 
            v-model.number="formData.days" 
            class="form-control"
            placeholder="實際滯納天數"
            min="0"
            :required="formData.calculationType !== 'late'"
          />
        </div>

        <!-- 年利率 -->
        <div class="form-group" v-if="formData.calculationType === 'interest' || formData.calculationType === 'complete'">
          <label for="annualRate">年利率 (%)</label>
          <input 
            id="annualRate"
            type="number" 
            v-model.number="formData.annualRate" 
            class="form-control"
            placeholder="預設 3.65%"
            step="0.01"
            min="0"
          />
        </div>

        <div class="button-group">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <i class="pi pi-calculator"></i>
            {{ loading ? '計算中...' : '計算滯納金' }}
          </button>
          <button type="button" class="btn btn-secondary" @click="handleReset">
            <i class="pi pi-refresh"></i>
            重置
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-danger">
        <i class="pi pi-exclamation-triangle"></i>
        {{ error }}
      </div>

      <div v-if="result" class="calculation-result">
        <div class="result-header">
          <h4><i class="pi pi-check-circle"></i> 計算結果</h4>
        </div>

        <!-- 滯納金結果 -->
        <div v-if="result.latePenalty" class="result-section">
          <h5><i class="pi pi-calendar"></i> 滯納金明細</h5>
          <div class="result-grid">
            <div class="result-item">
              <span class="result-label">原應納稅額</span>
              <span class="result-value">{{ formatCurrency(result.latePenalty.taxAmount) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">逾期天數</span>
              <span class="result-value">{{ result.latePenalty.overdueDays }} 天</span>
            </div>
            <div class="result-item highlight">
              <span class="result-label">滯納金</span>
              <span class="result-value danger">{{ formatCurrency(result.latePenalty.latePenalty) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">應繳總額</span>
              <span class="result-value primary">{{ formatCurrency(result.latePenalty.totalAmount) }}</span>
            </div>
          </div>

          <div v-if="result.latePenalty.penaltyDetails" class="penalty-details">
            <div v-for="(detail, index) in result.latePenalty.penaltyDetails" :key="index" class="detail-item">
              <span class="badge badge-warning">{{ detail.period }}</span>
              <span class="badge badge-danger">加徵 {{ detail.rate }}</span>
              <span class="badge badge-info">{{ detail.legalBasis }}</span>
            </div>
          </div>
        </div>

        <!-- 滯納利息結果 -->
        <div v-if="result.interest" class="result-section">
          <h5><i class="pi pi-money-bill"></i> 滯納利息明細</h5>
          <div class="result-grid">
            <div class="result-item">
              <span class="result-label">應納稅額</span>
              <span class="result-value">{{ formatCurrency(result.interest.taxAmount) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">滯納天數</span>
              <span class="result-value">{{ result.interest.days }} 天</span>
            </div>
            <div class="result-item">
              <span class="result-label">年利率</span>
              <span class="result-value">{{ result.interest.annualRate }}%</span>
            </div>
            <div class="result-item highlight">
              <span class="result-label">利息</span>
              <span class="result-value danger">{{ formatCurrency(result.interest.interest) }}</span>
            </div>
          </div>
        </div>

        <!-- 總計 -->
        <div v-if="result.summary" class="summary-section">
          <div class="summary-row">
            <span>原應納稅額</span>
            <span>{{ formatCurrency(result.summary.originalTax) }}</span>
          </div>
          <div class="summary-row">
            <span>滯納金 + 利息</span>
            <span class="text-danger">{{ formatCurrency(result.summary.totalPenalty) }}</span>
          </div>
          <div class="summary-row total">
            <span>應繳總額</span>
            <span class="text-primary">{{ formatCurrency(result.summary.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { useCalculationStore } from '../../stores/calculation.js';

export default {
  name: 'PenaltyCalculator',
  
  setup() {
    const calculationStore = useCalculationStore();
    
    const formData = reactive({
      calculationType: 'late',
      taxAmount: null,
      dueDate: '',
      paymentDate: new Date().toISOString().split('T')[0],
      days: null,
      annualRate: 3.65
    });
    
    const loading = ref(false);
    const error = ref(null);
    const result = ref(null);
    
    const handleCalculate = async () => {
      try {
        loading.value = true;
        error.value = null;
        result.value = null;
        
        if (!formData.taxAmount || formData.taxAmount <= 0) {
          error.value = '請輸入有效的應納稅額';
          return;
        }
        
        const response = await calculationStore.calculatePenalty(formData);
        
        if (response.success) {
          result.value = response.result;
        } else {
          error.value = response.error || '計算失敗';
        }
        
      } catch (err) {
        console.error('計算錯誤:', err);
        error.value = err.message || '計算過程發生錯誤';
      } finally {
        loading.value = false;
      }
    };
    
    const handleReset = () => {
      formData.calculationType = 'late';
      formData.taxAmount = null;
      formData.dueDate = '';
      formData.paymentDate = new Date().toISOString().split('T')[0];
      formData.days = null;
      formData.annualRate = 3.65;
      result.value = null;
      error.value = null;
    };
    
    const formatCurrency = (value) => {
      if (value == null) return '-';
      return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
      }).format(value);
    };
    
    return {
      formData,
      loading,
      error,
      result,
      handleCalculate,
      handleReset,
      formatCurrency
    };
  }
};
</script>

<style scoped>
.calculator-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.calculator-header {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
  padding: 24px;
}

.calculator-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  opacity: 0.9;
  margin: 0;
}

.calculator-body {
  padding: 24px;
}

.calculation-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
}

.form-group label.required::after {
  content: ' *';
  color: #e74c3c;
}

.form-control {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.form-control:focus {
  outline: none;
  border-color: #fa709a;
}

.form-text {
  font-size: 0.875rem;
  color: #6c757d;
}

.button-group {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: #fa709a;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #e85f88;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-danger {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.calculation-result {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}

.result-header h4 {
  margin: 0 0 20px 0;
  color: #27ae60;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-section {
  background: white;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.result-section h5 {
  margin: 0 0 16px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.result-item {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item.highlight {
  background: #fff3cd;
  border: 2px solid #ffc107;
}

.result-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.result-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.result-value.primary { color: #fa709a; }
.result-value.danger { color: #e74c3c; }

.penalty-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #e9ecef;
  color: #495057;
}

.badge-warning { background: #ffc107; color: #000; }
.badge-danger { background: #dc3545; color: white; }
.badge-info { background: #17a2b8; color: white; }

.summary-section {
  background: white;
  padding: 16px;
  border-radius: 6px;
  margin-top: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  font-size: 1rem;
}

.summary-row.total {
  font-weight: 700;
  font-size: 1.25rem;
  border-top: 2px solid #333;
  border-bottom: 2px solid #333;
  margin-top: 8px;
}

.text-danger { color: #e74c3c; }
.text-primary { color: #fa709a; }
</style>
