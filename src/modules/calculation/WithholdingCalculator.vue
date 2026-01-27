<template>
  <div class="calculator-card">
    <div class="calculator-header">
      <h3><i class="pi pi-calculator"></i> 扣繳稅額計算器</h3>
      <p class="text-muted">根據所得類別與身份自動計算應扣繳稅額</p>
    </div>

    <div class="calculator-body">
      <!-- 輸入表單 -->
      <form @submit.prevent="handleCalculate" class="calculation-form">
        <!-- 所得類別 -->
        <div class="form-group">
          <label for="incomeType" class="required">所得類別</label>
          <select 
            id="incomeType" 
            v-model="formData.incomeType" 
            class="form-control"
            required
          >
            <option value="">-- 請選擇 --</option>
            <option value="salary">薪資所得 (50)</option>
            <option value="professional">執行業務所得 (9A)</option>
            <option value="rent">租賃所得 (51)</option>
            <option value="interest">利息所得 (5A)</option>
            <option value="dividend">股利所得 (54)</option>
            <option value="other">其他所得</option>
          </select>
        </div>

        <!-- 身份別 -->
        <div class="form-group">
          <label for="residency" class="required">身份別</label>
          <select 
            id="residency" 
            v-model="formData.residency" 
            class="form-control"
            required
          >
            <option value="resident">本國居民</option>
            <option value="non-resident">非居民</option>
          </select>
        </div>

        <!-- 給付金額 -->
        <div class="form-group">
          <label for="amount" class="required">給付金額（新台幣）</label>
          <input 
            id="amount"
            type="number" 
            v-model.number="formData.amount" 
            class="form-control"
            placeholder="例如：100000"
            min="0"
            step="1"
            required
          />
        </div>

        <!-- 給付日期 -->
        <div class="form-group">
          <label for="paymentDate">給付日期</label>
          <input 
            id="paymentDate"
            type="date" 
            v-model="formData.paymentDate" 
            class="form-control"
          />
        </div>

        <!-- 按鈕組 -->
        <div class="button-group">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <i class="pi pi-calculator"></i>
            {{ loading ? '計算中...' : '開始計算' }}
          </button>
          <button type="button" class="btn btn-secondary" @click="handleReset">
            <i class="pi pi-refresh"></i>
            重置
          </button>
        </div>
      </form>

      <!-- 錯誤訊息 -->
      <div v-if="error" class="alert alert-danger">
        <i class="pi pi-exclamation-triangle"></i>
        {{ error }}
      </div>

      <!-- 計算結果 -->
      <div v-if="result" class="calculation-result">
        <div class="result-header">
          <h4><i class="pi pi-check-circle"></i> 計算結果</h4>
          <span class="result-time">{{ formatDateTime(result.calculatedAt) }}</span>
        </div>

        <div class="result-grid">
          <!-- 給付金額 -->
          <div class="result-item">
            <span class="result-label">給付金額</span>
            <span class="result-value primary">{{ formatCurrency(result.amount) }}</span>
          </div>

          <!-- 扣繳稅額 -->
          <div class="result-item highlight">
            <span class="result-label">應扣繳稅額</span>
            <span class="result-value danger">{{ formatCurrency(result.withholdingTax) }}</span>
          </div>

          <!-- 實領金額 -->
          <div class="result-item">
            <span class="result-label">實領金額</span>
            <span class="result-value success">{{ formatCurrency(result.netAmount) }}</span>
          </div>

          <!-- 扣繳率 -->
          <div class="result-item">
            <span class="result-label">扣繳率</span>
            <span class="result-value">{{ result.rate }}%</span>
          </div>
        </div>

        <!-- 適用規則 -->
        <div v-if="result.appliedRules && result.appliedRules.length > 0" class="applied-rules">
          <h5><i class="pi pi-book"></i> 適用規則</h5>
          <div v-for="(rule, index) in result.appliedRules" :key="index" class="rule-item">
            <div class="rule-description">{{ rule.description }}</div>
            <div class="rule-detail">
              <span v-if="rule.threshold" class="badge">起扣點：{{ formatCurrency(rule.threshold) }}</span>
              <span class="badge badge-primary">稅率：{{ rule.rate }}</span>
              <span class="badge badge-info">{{ rule.legalBasis }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="result-actions">
          <button class="btn btn-outline" @click="handleSaveResult">
            <i class="pi pi-save"></i>
            儲存結果
          </button>
          <button class="btn btn-outline" @click="handleExport">
            <i class="pi pi-download"></i>
            匯出報表
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { useCalculationStore } from '../../stores/calculation.js';

export default {
  name: 'WithholdingCalculator',
  
  setup() {
    const calculationStore = useCalculationStore();
    
    // 表單數據
    const formData = reactive({
      incomeType: '',
      residency: 'resident',
      amount: null,
      paymentDate: new Date().toISOString().split('T')[0]
    });
    
    // 狀態
    const loading = ref(false);
    const error = ref(null);
    const result = ref(null);
    
    // 計算
    const handleCalculate = async () => {
      try {
        loading.value = true;
        error.value = null;
        result.value = null;
        
        // 驗證
        if (!formData.incomeType || !formData.amount) {
          error.value = '請填寫所有必填欄位';
          return;
        }
        
        if (formData.amount <= 0) {
          error.value = '給付金額必須大於 0';
          return;
        }
        
        // 調用 Store 計算
        const response = await calculationStore.calculateWithholding({
          incomeType: formData.incomeType,
          residency: formData.residency,
          amount: formData.amount,
          paymentDate: formData.paymentDate
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
    
    // 重置
    const handleReset = () => {
      formData.incomeType = '';
      formData.residency = 'resident';
      formData.amount = null;
      formData.paymentDate = new Date().toISOString().split('T')[0];
      result.value = null;
      error.value = null;
    };
    
    // 儲存結果
    const handleSaveResult = () => {
      if (!result.value) return;
      alert('結果已自動儲存到計算歷史記錄');
    };
    
    // 匯出報表
    const handleExport = () => {
      if (!result.value) return;
      
      const content = `
扣繳稅額計算結果
================
給付金額：${formatCurrency(result.value.amount)}
應扣繳稅額：${formatCurrency(result.value.withholdingTax)}
實領金額：${formatCurrency(result.value.netAmount)}
扣繳率：${result.value.rate}%
計算時間：${formatDateTime(result.value.calculatedAt)}
      `.trim();
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `扣繳計算_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    // 格式化金額
    const formatCurrency = (value) => {
      if (value == null) return '-';
      return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
      }).format(value);
    };
    
    // 格式化日期時間
    const formatDateTime = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('zh-TW');
    };
    
    return {
      formData,
      loading,
      error,
      result,
      handleCalculate,
      handleReset,
      handleSaveResult,
      handleExport,
      formatCurrency,
      formatDateTime
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
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
  background: #667eea;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-outline {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover {
  background: #f0f3ff;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.result-time {
  font-size: 0.875rem;
  color: #6c757d;
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

.result-value.primary { color: #667eea; }
.result-value.danger { color: #e74c3c; }
.result-value.success { color: #27ae60; }

.applied-rules {
  margin: 20px 0;
}

.applied-rules h5 {
  margin: 0 0 12px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.rule-description {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.rule-detail {
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

.badge-primary {
  background: #667eea;
  color: white;
}

.badge-info {
  background: #17a2b8;
  color: white;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
</style>
