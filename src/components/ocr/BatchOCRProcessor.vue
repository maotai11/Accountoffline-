<template>
  <div class="batch-ocr-processor">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h2><i class="pi pi-images"></i> 發票批量 OCR 識別</h2>
      <div class="header-actions">
        <Button label="匯出 Excel" icon="pi pi-file-excel" @click="exportToExcel" :disabled="processedInvoices.length === 0" severity="success" />
        <Button label="清除全部" icon="pi pi-trash" @click="confirmClearAll" :disabled="processedInvoices.length === 0" severity="danger" outlined />
      </div>
    </div>

    <!-- ⭐ 新增：篩選條件輸入區 -->
    <div class="filter-section">
      <Card>
        <template #title>
          <i class="pi pi-filter"></i> 驗證條件設定
        </template>
        <template #content>
          <div class="filter-form">
            <div class="form-row">
              <div class="form-field">
                <label for="expectedTaxId">買方統編 <span class="required">*</span></label>
                <InputText 
                  id="expectedTaxId" 
                  v-model="filterConfig.expectedTaxId" 
                  placeholder="請輸入 8 位數統編（例：12345678）"
                  maxlength="8"
                  @input="validateTaxIdInput"
                />
                <small class="hint">識別後將核對統編是否一致，不符者會標記異常</small>
              </div>

              <div class="form-field">
                <label for="periodStart">期間起始 <span class="required">*</span></label>
                <Calendar 
                  id="periodStart" 
                  v-model="filterConfig.periodStart" 
                  dateFormat="yy-mm-dd" 
                  placeholder="選擇開始日期（例：2024-11-01）"
                  :showIcon="true"
                  :maxDate="filterConfig.periodEnd || new Date()"
                />
                <small class="hint">早於此日期的發票會標記警告（可能是補開）</small>
              </div>

              <div class="form-field">
                <label for="periodEnd">期間結束 <span class="required">*</span></label>
                <Calendar 
                  id="periodEnd" 
                  v-model="filterConfig.periodEnd" 
                  dateFormat="yy-mm-dd" 
                  placeholder="選擇結束日期（例：2024-12-31）"
                  :showIcon="true"
                  :minDate="filterConfig.periodStart"
                  :maxDate="new Date()"
                />
                <small class="hint">晚於此日期的發票會標記錯誤（超出期間）</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field checkbox-field">
                <Checkbox 
                  id="allowEarlierDate" 
                  v-model="filterConfig.allowEarlierDate" 
                  :binary="true" 
                />
                <label for="allowEarlierDate">容許早於期間起始的發票（補開發票）</label>
              </div>

              <div class="form-field checkbox-field">
                <Checkbox 
                  id="strictMode" 
                  v-model="filterConfig.strictMode" 
                  :binary="true" 
                />
                <label for="strictMode">嚴格模式（警告視為錯誤）</label>
              </div>
            </div>

            <div class="filter-summary" v-if="isFilterConfigValid">
              <Message severity="info" :closable="false">
                <template #icon><i class="pi pi-info-circle"></i></template>
                驗證設定：統編 <strong>{{ filterConfig.expectedTaxId }}</strong>，期間 <strong>{{ formatDate(filterConfig.periodStart) }} ~ {{ formatDate(filterConfig.periodEnd) }}</strong>
              </Message>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 上傳區域 -->
    <div class="upload-section">
      <div class="upload-card" :class="{ 'drag-over': isDragging }">
        <FileUpload 
          ref="fileUpload"
          mode="advanced" 
          name="invoices[]" 
          accept="image/*,application/pdf"
          :multiple="true"
          :customUpload="true"
          @uploader="handleUpload"
          @select="onFilesSelected"
          :auto="false"
          :showUploadButton="false"
          :showCancelButton="false"
        >
          <template #header="{ chooseCallback, clearCallback, files }">
            <div class="upload-header">
              <Button icon="pi pi-images" label="選擇發票圖片" @click="chooseCallback" outlined />
              <Button icon="pi pi-times" label="清除" @click="clearCallback" :disabled="!files || files.length === 0" outlined severity="danger" />
              <span class="file-count" v-if="files && files.length > 0">
                已選擇 {{ files.length }} 個文件
              </span>
            </div>
          </template>

          <template #content="{ files, removeFileCallback }">
            <div v-if="files.length > 0" class="file-preview-list">
              <div v-for="(file, index) in files" :key="file.name + index" class="file-preview-item">
                <img :src="getFilePreview(file)" :alt="file.name" class="preview-image" />
                <div class="file-info">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
                <Button icon="pi pi-times" @click="removeFileCallback(index)" text rounded severity="danger" size="small" />
              </div>
            </div>
            <div v-else class="empty-upload">
              <i class="pi pi-cloud-upload" style="font-size: 3rem; color: #cbd5e0;"></i>
              <p>拖放發票圖片到此處，或點擊「選擇發票圖片」</p>
              <p class="hint">支援 JPG、PNG、PDF 格式，可一次上傳多個文件（建議 ≤ 1000 張）</p>
            </div>
          </template>
        </FileUpload>

        <!-- 開始處理按鈕 -->
        <div class="upload-actions" v-if="selectedFiles.length > 0">
          <Button 
            :label="`開始批量識別 (${selectedFiles.length} 張)`"
            icon="pi pi-play" 
            @click="startBatchProcess" 
            :loading="isProcessing"
            :disabled="isProcessing || !isFilterConfigValid"
            severity="primary"
            size="large"
          />
          <Message v-if="!isFilterConfigValid" severity="warn" :closable="false">
            請先完成驗證條件設定（統編、期間起始、期間結束）
          </Message>
        </div>
      </div>
    </div>

    <!-- 處理進度 -->
    <div v-if="isProcessing" class="progress-section">
      <Card>
        <template #title>
          <div class="progress-title">
            <i class="pi pi-spin pi-spinner"></i>
            正在處理發票...
          </div>
        </template>
        <template #content>
          <div class="progress-info">
            <span>進度: {{ processingProgress.current }} / {{ processingProgress.total }}</span>
            <span class="progress-percent">{{ processingProgress.percentage }}%</span>
          </div>
          <ProgressBar :value="processingProgress.percentage" :showValue="false" />
          <div class="progress-status">
            <Tag icon="pi pi-check" severity="success" :value="`成功: ${processingStats.success}`" />
            <Tag icon="pi pi-exclamation-triangle" severity="warning" :value="`警告: ${processingStats.warnings}`" />
            <Tag icon="pi pi-times" severity="danger" :value="`失敗: ${processingStats.failed}`" />
          </div>
        </template>
      </Card>
    </div>

    <!-- 處理結果列表 -->
    <div v-if="processedInvoices.length > 0" class="results-section">
      <div class="results-header">
        <h3>
          <i class="pi pi-list"></i> 
          識別結果 ({{ processedInvoices.length }})
        </h3>
        <div class="results-filters">
          <Dropdown 
            v-model="selectedFilter" 
            :options="filterOptions" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="篩選顯示"
            @change="applyFilter"
          />
          <InputText v-model="searchQuery" placeholder="搜尋發票號碼..." @input="applySearch" />
        </div>
      </div>

      <!-- 結果統計 -->
      <div class="results-stats">
        <div class="stat-card stat-all">
          <span class="stat-label">全部</span>
          <span class="stat-value">{{ processedInvoices.length }}</span>
        </div>
        <div class="stat-card stat-valid" @click="selectedFilter = 'valid'; applyFilter()">
          <span class="stat-label">正常</span>
          <span class="stat-value">{{ validationStats.valid }}</span>
        </div>
        <div class="stat-card stat-warning" @click="selectedFilter = 'warnings'; applyFilter()">
          <span class="stat-label">警告</span>
          <span class="stat-value">{{ validationStats.warnings }}</span>
        </div>
        <div class="stat-card stat-error" @click="selectedFilter = 'errors'; applyFilter()">
          <span class="stat-label">錯誤</span>
          <span class="stat-value">{{ validationStats.errors }}</span>
        </div>
        <div class="stat-card stat-tax-mismatch" @click="selectedFilter = 'tax_id_mismatch'; applyFilter()">
          <span class="stat-label">統編不符</span>
          <span class="stat-value">{{ validationStats.taxIdMismatch }}</span>
        </div>
        <div class="stat-card stat-date-error" @click="selectedFilter = 'date_out_of_range'; applyFilter()">
          <span class="stat-label">日期超範圍</span>
          <span class="stat-value">{{ validationStats.dateOutOfRange }}</span>
        </div>
      </div>

      <!-- 發票表格 -->
      <DataTable 
        :value="filteredInvoices" 
        :paginator="true" 
        :rows="20"
        :rowsPerPageOptions="[20, 50, 100]"
        responsiveLayout="scroll"
        stripedRows
        :rowClass="getRowClass"
        @row-click="onRowClick"
      >
        <Column field="status" header="狀態" :style="{ width: '80px' }">
          <template #body="{ data }">
            <Tag v-if="data.validationResult?.severity === 'none'" icon="pi pi-check" severity="success" value="正常" />
            <Tag v-else-if="data.validationResult?.severity === 'warning'" icon="pi pi-exclamation-triangle" severity="warning" value="警告" />
            <Tag v-else icon="pi pi-times" severity="danger" value="錯誤" />
          </template>
        </Column>

        <Column field="invoiceNo" header="發票號碼" :style="{ width: '150px' }">
          <template #body="{ data }">
            <span :class="{ 'field-error': hasFieldError(data, 'invoiceNo') }">
              {{ data.invoice.invoiceNo || '未識別' }}
            </span>
          </template>
        </Column>

        <Column field="date" header="日期" :style="{ width: '120px' }">
          <template #body="{ data }">
            <span :class="getDateClass(data)">
              {{ formatDate(data.invoice.date) || '未識別' }}
            </span>
          </template>
        </Column>

        <Column field="taxId" header="買方統編" :style="{ width: '120px' }">
          <template #body="{ data }">
            <span :class="{ 'field-error': data.invoice._taxIdMismatch }">
              {{ data.invoice.taxId || '未識別' }}
              <i v-if="data.invoice._taxIdMismatch" class="pi pi-exclamation-circle error-icon" v-tooltip="'統編不符'"></i>
            </span>
          </template>
        </Column>

        <Column field="subtotal" header="未稅金額" :style="{ width: '120px', textAlign: 'right' }">
          <template #body="{ data }">
            <span :class="{ 'calculated-value': data.invoice._splitInfo?.calculated }">
              {{ formatCurrency(data.invoice.subtotal) }}
              <i v-if="data.invoice._splitInfo?.isClass3" class="pi pi-calculator text-blue-500" v-tooltip="'三類發票自動計算'"></i>
            </span>
          </template>
        </Column>

        <Column field="taxAmount" header="稅額" :style="{ width: '100px', textAlign: 'right' }">
          <template #body="{ data }">
            <span :class="{ 'calculated-value': data.invoice._splitInfo?.calculated }">
              {{ formatCurrency(data.invoice.taxAmount) }}
            </span>
          </template>
        </Column>

        <Column field="total" header="總計" :style="{ width: '120px', textAlign: 'right' }">
          <template #body="{ data }">
            <strong>{{ formatCurrency(data.invoice.total) }}</strong>
          </template>
        </Column>

        <Column field="confidence" header="信心度" :style="{ width: '100px' }">
          <template #body="{ data }">
            <ProgressBar 
              :value="(data.invoice.confidence?.average || 0) * 100" 
              :showValue="true"
              :class="getConfidenceClass(data.invoice.confidence?.average)"
            />
          </template>
        </Column>

        <Column header="操作" :style="{ width: '200px' }">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" label="編輯" @click="editInvoice(data)" text size="small" />
            <Button icon="pi pi-eye" label="檢視" @click="viewInvoice(data)" text size="small" />
            <Button icon="pi pi-trash" @click="deleteInvoice(data)" text severity="danger" size="small" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- 編輯對話框 -->
    <Dialog v-model:visible="showEditDialog" header="編輯發票資料" :style="{ width: '800px' }" modal>
      <OCRResultEditor 
        v-if="editingInvoice"
        :invoice-data="editingInvoice.invoice"
        @save="onSaveEdit"
        @cancel="showEditDialog = false"
      />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import OCRResultEditor from './OCRResultEditor.vue';

const toast = useToast();

// ========== 篩選條件配置 ⭐ 新增 ==========
const filterConfig = reactive({
  expectedTaxId: '',       // 預期統編
  periodStart: null,       // 期間起始
  periodEnd: null,         // 期間結束
  allowEarlierDate: true,  // 容許早於期間
  strictMode: false        // 嚴格模式
});

// 驗證配置是否完整
const isFilterConfigValid = computed(() => {
  return filterConfig.expectedTaxId.length === 8 && 
         filterConfig.periodStart && 
         filterConfig.periodEnd;
});

// 驗證統編輸入（只允許數字）
const validateTaxIdInput = () => {
  filterConfig.expectedTaxId = filterConfig.expectedTaxId.replace(/\D/g, '');
};

// ========== 文件上傳相關 ==========
const selectedFiles = ref([]);
const isDragging = ref(false);

const onFilesSelected = (event) => {
  selectedFiles.value = event.files;
  toast.add({ severity: 'info', summary: '文件已選擇', detail: `共 ${event.files.length} 個文件`, life: 3000 });
};

const getFilePreview = (file) => {
  return URL.createObjectURL(file);
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

// ========== 批量處理相關 ==========
const isProcessing = ref(false);
const processingProgress = reactive({
  current: 0,
  total: 0,
  percentage: 0
});
const processingStats = reactive({
  success: 0,
  warnings: 0,
  failed: 0
});

const processedInvoices = ref([]);

// 開始批量處理
const startBatchProcess = async () => {
  if (!isFilterConfigValid.value) {
    toast.add({ severity: 'warn', summary: '設定不完整', detail: '請先完成驗證條件設定', life: 3000 });
    return;
  }

  isProcessing.value = true;
  processingProgress.current = 0;
  processingProgress.total = selectedFiles.value.length;
  processingStats.success = 0;
  processingStats.warnings = 0;
  processingStats.failed = 0;

  // 初始化 OCR 工作流
  const workflow = new window.OCRWorkflow();
  const validator = new window.InvoiceValidator({
    expectedTaxId: filterConfig.expectedTaxId,
    periodStart: formatDateISO(filterConfig.periodStart),
    periodEnd: formatDateISO(filterConfig.periodEnd),
    allowEarlierDate: filterConfig.allowEarlierDate,
    strictMode: filterConfig.strictMode
  });

  for (const file of selectedFiles.value) {
    try {
      // 執行 OCR 識別
      const result = await workflow.processFile(file);
      
      // 執行驗證
      const validationResult = validator.validate(result.data);
      
      // 合併結果
      processedInvoices.value.push({
        file,
        invoice: validationResult.invoice,
        validationResult,
        timestamp: new Date()
      });

      // 更新統計
      if (validationResult.valid) {
        if (validationResult.warnings.length > 0) {
          processingStats.warnings++;
        } else {
          processingStats.success++;
        }
      } else {
        processingStats.failed++;
      }

    } catch (error) {
      console.error('處理失敗:', file.name, error);
      processingStats.failed++;
      toast.add({ severity: 'error', summary: '識別失敗', detail: file.name, life: 3000 });
    }

    // 更新進度
    processingProgress.current++;
    processingProgress.percentage = Math.round((processingProgress.current / processingProgress.total) * 100);
  }

  isProcessing.value = false;
  toast.add({ severity: 'success', summary: '批量處理完成', detail: `成功 ${processingStats.success}，警告 ${processingStats.warnings}，失敗 ${processingStats.failed}`, life: 5000 });
};

// ========== 驗證統計 ⭐ 新增 ==========
const validationStats = computed(() => {
  return {
    valid: processedInvoices.value.filter(inv => inv.validationResult.valid && inv.validationResult.warnings.length === 0).length,
    warnings: processedInvoices.value.filter(inv => inv.validationResult.warnings.length > 0).length,
    errors: processedInvoices.value.filter(inv => !inv.validationResult.valid).length,
    taxIdMismatch: processedInvoices.value.filter(inv => inv.invoice._taxIdMismatch).length,
    dateOutOfRange: processedInvoices.value.filter(inv => inv.invoice._dateOutOfRange).length
  };
});

// ========== 篩選與搜尋 ==========
const selectedFilter = ref('all');
const searchQuery = ref('');
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'valid' },
  { label: '警告', value: 'warnings' },
  { label: '錯誤', value: 'errors' },
  { label: '統編不符', value: 'tax_id_mismatch' },
  { label: '日期超範圍', value: 'date_out_of_range' }
];

const filteredInvoices = computed(() => {
  let results = processedInvoices.value;

  // 應用篩選
  if (selectedFilter.value !== 'all') {
    const validator = new window.InvoiceValidator();
    const validationResults = results.map(inv => inv.validationResult);
    const filtered = validator.filterResults(validationResults, selectedFilter.value);
    results = results.filter(inv => filtered.includes(inv.validationResult));
  }

  // 應用搜尋
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    results = results.filter(inv => 
      inv.invoice.invoiceNo?.toLowerCase().includes(query) ||
      inv.invoice.taxId?.toLowerCase().includes(query)
    );
  }

  return results;
});

const applyFilter = () => {
  // 篩選會自動通過 computed 應用
};

const applySearch = () => {
  // 搜尋會自動通過 computed 應用
};

// ========== 表格樣式 ==========
const getRowClass = (data) => {
  if (data.validationResult.severity === 'error') return 'row-error';
  if (data.validationResult.severity === 'warning') return 'row-warning';
  return '';
};

const getDateClass = (data) => {
  if (data.invoice._dateStatus === 'after_period') return 'field-error';
  if (data.invoice._dateStatus === 'before_period') return 'field-warning';
  return '';
};

const hasFieldError = (data, field) => {
  return data.validationResult.errors.some(e => 
    e.type === 'missing_fields' && e.fields?.includes(field)
  );
};

const getConfidenceClass = (confidence) => {
  if (!confidence) return 'confidence-low';
  if (confidence >= 0.9) return 'confidence-high';
  if (confidence >= 0.7) return 'confidence-medium';
  return 'confidence-low';
};

// ========== 編輯功能 ==========
const showEditDialog = ref(false);
const editingInvoice = ref(null);

const editInvoice = (data) => {
  editingInvoice.value = data;
  showEditDialog.value = true;
};

const onSaveEdit = (updatedData) => {
  // 更新發票數據
  editingInvoice.value.invoice = updatedData;
  
  // 重新驗證
  const validator = new window.InvoiceValidator({
    expectedTaxId: filterConfig.expectedTaxId,
    periodStart: formatDateISO(filterConfig.periodStart),
    periodEnd: formatDateISO(filterConfig.periodEnd),
    allowEarlierDate: filterConfig.allowEarlierDate,
    strictMode: filterConfig.strictMode
  });
  editingInvoice.value.validationResult = validator.validate(updatedData);
  
  showEditDialog.value = false;
  toast.add({ severity: 'success', summary: '已儲存', detail: '發票資料已更新', life: 3000 });
};

const viewInvoice = (data) => {
  // 顯示完整資訊（可擴展）
  console.log('查看發票:', data);
};

const deleteInvoice = (data) => {
  const index = processedInvoices.value.indexOf(data);
  if (index > -1) {
    processedInvoices.value.splice(index, 1);
    toast.add({ severity: 'info', summary: '已刪除', detail: '發票已從列表移除', life: 3000 });
  }
};

const confirmClearAll = () => {
  if (confirm('確定要清除所有識別結果嗎？')) {
    processedInvoices.value = [];
    selectedFiles.value = [];
    toast.add({ severity: 'info', summary: '已清除', detail: '所有資料已清除', life: 3000 });
  }
};

// ========== Excel 匯出 ==========
const exportToExcel = async () => {
  try {
    const exporter = new window.ExcelImageExporter();
    
    // 準備導出數據
    const exportData = processedInvoices.value.map(inv => ({
      invoice: inv.invoice,
      imageFile: inv.file,
      validationResult: inv.validationResult
    }));
    
    await exporter.exportWithImages(exportData, {
      filename: `發票識別結果_${formatDateISO(new Date())}.xlsx`,
      sheetName: '發票明細',
      filterConfig: filterConfig
    });
    
    toast.add({ severity: 'success', summary: '匯出成功', detail: 'Excel 文件已下載', life: 3000 });
  } catch (error) {
    console.error('匯出失敗:', error);
    toast.add({ severity: 'error', summary: '匯出失敗', detail: error.message, life: 5000 });
  }
};

// ========== 工具函數 ==========
const formatDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
};

const onRowClick = (event) => {
  // 行點擊事件（可擴展）
};

onMounted(() => {
  console.log('[BatchOCRProcessor] 組件已掛載');
});
</script>

<style scoped>
.batch-ocr-processor {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* ⭐ 篩選條件區 */
.filter-section {
  margin-bottom: 1.5rem;
}

.filter-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.required {
  color: #e74c3c;
}

.hint {
  color: #6c757d;
  font-size: 0.85rem;
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-field label {
  margin: 0;
  font-weight: normal;
}

.filter-summary {
  margin-top: 0.5rem;
}

/* 上傳區 */
.upload-section {
  margin-bottom: 1.5rem;
}

.upload-card {
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.upload-card.drag-over {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.upload-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.file-count {
  color: #6c757d;
  font-weight: 600;
}

.file-preview-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.file-preview-item {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
}

.file-name {
  font-size: 0.85rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.file-size {
  font-size: 0.75rem;
  color: #6c757d;
}

.empty-upload {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.upload-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* 進度區 */
.progress-section {
  margin-bottom: 1.5rem;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.progress-percent {
  color: #3b82f6;
}

.progress-status {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

/* 結果區 */
.results-section {
  margin-top: 2rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.results-filters {
  display: flex;
  gap: 0.5rem;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9fa;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-valid { border-color: #10b981; }
.stat-valid .stat-value { color: #10b981; }

.stat-warning { border-color: #f59e0b; }
.stat-warning .stat-value { color: #f59e0b; }

.stat-error { border-color: #ef4444; }
.stat-error .stat-value { color: #ef4444; }

.stat-tax-mismatch { border-color: #8b5cf6; }
.stat-tax-mismatch .stat-value { color: #8b5cf6; }

.stat-date-error { border-color: #ec4899; }
.stat-date-error .stat-value { color: #ec4899; }

/* 表格樣式 */
.row-error {
  background-color: #fee2e2 !important;
}

.row-warning {
  background-color: #fef3c7 !important;
}

.field-error {
  color: #ef4444;
  font-weight: 600;
}

.field-warning {
  color: #f59e0b;
}

.error-icon {
  margin-left: 0.25rem;
  color: #ef4444;
}

.calculated-value {
  color: #3b82f6;
}

.confidence-high :deep(.p-progressbar-value) {
  background: #10b981;
}

.confidence-medium :deep(.p-progressbar-value) {
  background: #f59e0b;
}

.confidence-low :deep(.p-progressbar-value) {
  background: #ef4444;
}
</style>
