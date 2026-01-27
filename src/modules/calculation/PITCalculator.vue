<template>
  <div class="calculator-card">
    <div class="calculator-header">
      <h3><i class="pi pi-percentage"></i> 綜合所得稅計算器</h3>
      <p class="text-muted">計算個人綜合所得稅應納稅額</p>
    </div>

    <div class="calculator-body">
      <form @submit.prevent="handleCalculate" class="calculation-form">
        <!-- 所得總額 -->
        <div class="form-group">
          <label for="grossIncome" class="required">所得總額</label>
          <input 
            id="grossIncome"
            type="number" 
            v-model.number="formData.grossIncome" 
            class="form-control"
            placeholder="全年所得總額"
            min="0"
            required
          />
        </div>

        <!-- 免稅額 -->
        <div class="form-group">
          <label for="exemption">免稅額</label>
          <input 
            id="exemption"
            type="number" 
            v-model.number="formData.exemption" 
            class="form-control"
            placeholder="個人免稅額 97,000"
          />
        </div>

        <!-- 扣除額 -->
        <div class="form-group">
          <label for="deduction">扣除額</label>
          <input 
            id="deduction"
            type="number" 
            v-model.number="formData.deduction" 
            class="form-control"
            placeholder="標準扣除額 + 特別扣除額"
          />
        </div>

        <div class="button-group">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <i class="pi pi-calculator"></i>
            {{ loading ? '計算中...' : '計算稅額' }}
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

        <div class="result-grid">
          <div class="result-item">
            <span class="result-label">課稅所得額</span>
            <span class="result-value primary">{{ formatCurrency(result.taxableIncome) }}</span>
          </div>

          <div class="result-item highlight">
            <span class="result-label">應納稅額</span>
            <span class="result-value danger">{{ formatCurrency(result.taxAmount) }}</span>
          </div>

          <div class="result-item">
            <span class="result-label">有效稅率</span>
            <span class="result-value">{{ result.effectiveRate.toFixed(2) }}%</span>
          </div>

          <div class="result-item">
            <span class="result-label">適用級距</span>
            <span class="result-value">{{ result.taxBracket || '-' }}</span>
          </div>
        </div>

        <div v-if="result.calculation" class="calculation-detail">
          <h5>計算明細</h5>
          <div class="detail-row">
            <span>所得總額</span>
            <span>{{ formatCurrency(result.calculation.grossIncome) }}</span>
          </div>
          <div class="detail-row">
            <span>減：免稅額</span>
            <span>-{{ formatCurrency(result.calculation.exemption) }}</span>
          </div>
          <div class="detail-row">
            <span>減：扣除額</span>
            <span>-{{ formatCurrency(result.calculation.deduction) }}</span>
          </div>
          <div class="detail-row total">
            <span>課稅所得額</span>
            <span>{{ formatCurrency(result.taxableIncome) }}</span>
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
  name: 'PITCalculator',
  
  setup() {
    const calculationStore = useCalculationStore();
    
    const formData = reactive({
      grossIncome: null,
      exemption: 97000,
      deduction: 131000
    });
    
    const loading = ref(false);
    const error = ref(null);
    const result = ref(null);
    
    const handleCalculate = async () => {
      try {
        loading.value = true;
        error.value = null;
        result.value = null;
        
        if (!formData.grossIncome || formData.grossIncome <= 0) {
          error.value = '請輸入有效的所得總額';
          return;
        }
        
        const response = await calculationStore.calculatePIT({
          grossIncome: formData.grossIncome,
          exemption: formData.exemption || 0,
          deduction: formData.deduction || 0
        });
        
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
      formData.grossIncome = null;
      formData.exemption = 97000;
      formData.deduction = 131000;
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
/* 重用 WithholdingCalculator 的樣式 */
.calculator-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.calculator-header {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
  border-color: #f5576c;
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
  background: #f5576c;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #e0465a;
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

.result-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
}

.result-header h4 {
  margin: 0;
  color: #27ae60;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.result-item {
  background: white;
  padding: 16px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: 1.5rem;
  font-weight: 700;
}

.result-value.primary { color: #f5576c; }
.result-value.danger { color: #e74c3c; }

.calculation-detail {
  background: white;
  padding: 16px;
  border-radius: 6px;
  margin-top: 16px;
}

.calculation-detail h5 {
  margin: 0 0 12px 0;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.detail-row.total {
  font-weight: 700;
  border-top: 2px solid #333;
  border-bottom: 2px solid #333;
  margin-top: 8px;
}
</style>
