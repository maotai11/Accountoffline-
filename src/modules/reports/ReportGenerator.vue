<template>
  <div class="report-generator">
    <div class="page-header">
      <h1><i class="pi pi-file-pdf"></i> 報表生成工具</h1>
      <button class="btn btn-primary" @click="generateBatch" :disabled="selectedRecords.length === 0">
        <i class="pi pi-download"></i> 批量生成 ({{ selectedRecords.length }})
      </button>
    </div>

    <!-- 快速選擇 -->
    <div class="quick-select">
      <button class="btn btn-outline" @click="selectAll">全選</button>
      <button class="btn btn-outline" @click="selectNone">取消全選</button>
      <button class="btn btn-outline" @click="selectByType('withholding')">扣繳</button>
      <button class="btn btn-outline" @click="selectByType('pit')">綜所稅</button>
      <button class="btn btn-outline" @click="selectByType('penalty')">滯納金</button>
    </div>

    <!-- 計算記錄列表 -->
    <div class="records-section">
      <div class="section-header">
        <h2>選擇計算記錄</h2>
        <div class="filters">
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="搜尋..."
            class="search-input"
          />
          <select v-model="filterType" @change="applyFilters">
            <option value="">全部類型</option>
            <option value="withholding">扣繳</option>
            <option value="pit">綜所稅</option>
            <option value="cit">營所稅</option>
            <option value="penalty">滯納金</option>
          </select>
        </div>
      </div>

      <div class="records-list">
        <div 
          v-for="record in filteredRecords" 
          :key="record.id"
          class="record-item"
          :class="{ 'selected': selectedRecords.includes(record.id) }"
          @click="toggleSelect(record.id)"
        >
          <input 
            type="checkbox" 
            :checked="selectedRecords.includes(record.id)"
            @click.stop="toggleSelect(record.id)"
          />
          <div class="record-icon" :class="`type-${record.type}`">
            <i :class="getTypeIcon(record.type)"></i>
          </div>
          <div class="record-content">
            <h4>{{ record.title || '未命名計算' }}</h4>
            <p>{{ record.description || getTypeLabel(record.type) }}</p>
            <span class="record-date">{{ formatDate(record.createdAt) }}</span>
          </div>
          <div class="record-actions" @click.stop>
            <button class="icon-btn" @click="previewReport(record)" title="預覽">
              <i class="pi pi-eye"></i>
            </button>
            <button class="icon-btn" @click="generateSingle(record)" title="生成">
              <i class="pi pi-download"></i>
            </button>
          </div>
        </div>

        <div v-if="filteredRecords.length === 0" class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>沒有可用的計算記錄</p>
        </div>
      </div>
    </div>

    <!-- 報表設定 -->
    <div class="settings-section">
      <h2>報表設定</h2>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>報表標題</label>
          <input 
            type="text" 
            v-model="reportSettings.title"
            placeholder="例如：2025年1月稅務計算報表"
          />
        </div>

        <div class="setting-group">
          <label>公司名稱</label>
          <input 
            type="text" 
            v-model="reportSettings.companyName"
            placeholder="例如：XX會計師事務所"
          />
        </div>

        <div class="setting-group">
          <label>報表格式</label>
          <select v-model="reportSettings.format">
            <option value="individual">個別報表</option>
            <option value="combined">合併報表</option>
          </select>
        </div>

        <div class="setting-group">
          <label>檔名格式</label>
          <input 
            type="text" 
            v-model="reportSettings.filenamePattern"
            placeholder="{type}_{date}_{id}"
          />
          <small>可用變數: {type}, {date}, {id}, {index}</small>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="reportSettings.includeSummary" />
            <span>包含統計摘要</span>
          </label>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="reportSettings.includeCharts" />
            <span>包含圖表分析</span>
          </label>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="reportSettings.addWatermark" />
            <span>添加浮水印</span>
          </label>
        </div>

        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="reportSettings.zipOutput" />
            <span>壓縮為 ZIP</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 生成進度 -->
    <div v-if="generating" class="progress-section">
      <div class="progress-header">
        <h3>生成中...</h3>
        <span>{{ generatedCount }} / {{ totalToGenerate }}</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(generatedCount / totalToGenerate) * 100}%` }"
        ></div>
      </div>
      <p class="progress-message">{{ currentGenerating }}</p>
    </div>

    <!-- 預覽 Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="closePreview">
      <div class="modal-content preview-modal">
        <div class="modal-header">
          <h3><i class="pi pi-eye"></i> 報表預覽</h3>
          <button class="close-btn" @click="closePreview">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="preview-content">
            <iframe v-if="previewUrl" :src="previewUrl" frameborder="0"></iframe>
            <div v-else class="loading-preview">
              <i class="pi pi-spin pi-spinner"></i>
              <p>生成預覽中...</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closePreview">關閉</button>
          <button class="btn btn-primary" @click="downloadPreview">
            <i class="pi pi-download"></i> 下載
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PDFGenerator from '../../core/engines/pdf/PDFGenerator.js';
import Sanitizer from '../../utils/sanitizer.js';

export default {
  name: 'ReportGenerator',
  
  data() {
    return {
      records: [],
      filteredRecords: [],
      selectedRecords: [],
      searchQuery: '',
      filterType: '',
      
      reportSettings: {
        title: '',
        companyName: '',
        format: 'individual',
        filenamePattern: '{type}_{date}_{id}',
        includeSummary: true,
        includeCharts: false,
        addWatermark: false,
        zipOutput: false
      },
      
      generating: false,
      generatedCount: 0,
      totalToGenerate: 0,
      currentGenerating: '',
      
      showPreviewModal: false,
      previewUrl: null,
      previewRecord: null,
      
      pdfGenerator: null
    };
  },
  
  mounted() {
    this.loadRecords();
    this.pdfGenerator = new PDFGenerator();
  },
  
  methods: {
    async loadRecords() {
      try {
        const db = await this.openDatabase();
        const tx = db.transaction('calculations', 'readonly');
        const store = tx.objectStore('calculations');
        const request = store.getAll();
        
        request.onsuccess = () => {
          this.records = request.result || [];
          this.filteredRecords = this.records;
        };
      } catch (error) {
        console.error('[ReportGenerator] 載入記錄失敗:', error);
      }
    },
    
    async openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('AccountingDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    
    applyFilters() {
      let filtered = this.records;
      
      if (this.searchQuery) {
        const query = Sanitizer.escapeHTML(this.searchQuery.toLowerCase());
        filtered = filtered.filter(r => 
          r.title?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
        );
      }
      
      if (this.filterType) {
        filtered = filtered.filter(r => r.type === this.filterType);
      }
      
      this.filteredRecords = filtered;
    },
    
    toggleSelect(id) {
      const index = this.selectedRecords.indexOf(id);
      if (index > -1) {
        this.selectedRecords.splice(index, 1);
      } else {
        this.selectedRecords.push(id);
      }
    },
    
    selectAll() {
      this.selectedRecords = this.filteredRecords.map(r => r.id);
    },
    
    selectNone() {
      this.selectedRecords = [];
    },
    
    selectByType(type) {
      this.selectedRecords = this.filteredRecords
        .filter(r => r.type === type)
        .map(r => r.id);
    },
    
    async generateSingle(record) {
      try {
        const doc = await this.generatePDF(record);
        const filename = this.buildFilename(record, 0);
        await this.pdfGenerator.savePDF(doc, filename);
      } catch (error) {
        console.error('[ReportGenerator] 生成報表失敗:', error);
        alert('生成失敗，請稍後再試');
      }
    },
    
    async generateBatch() {
      if (this.selectedRecords.length === 0) return;
      
      this.generating = true;
      this.generatedCount = 0;
      this.totalToGenerate = this.selectedRecords.length;
      
      try {
        const selectedData = this.records.filter(r => 
          this.selectedRecords.includes(r.id)
        );
        
        if (this.reportSettings.format === 'combined') {
          await this.generateCombinedReport(selectedData);
        } else {
          await this.generateIndividualReports(selectedData);
        }
        
        alert('報表生成完成！');
      } catch (error) {
        console.error('[ReportGenerator] 批量生成失敗:', error);
        alert('生成失敗，請稍後再試');
      } finally {
        this.generating = false;
        this.generatedCount = 0;
        this.totalToGenerate = 0;
      }
    },
    
    async generateIndividualReports(records) {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        this.currentGenerating = `正在生成: ${record.title || '未命名'}`;
        
        try {
          const doc = await this.generatePDF(record);
          const filename = this.buildFilename(record, i);
          await this.pdfGenerator.savePDF(doc, filename);
          this.generatedCount++;
        } catch (error) {
          console.error(`生成 ${record.id} 失敗:`, error);
        }
      }
    },
    
    async generateCombinedReport(records) {
      this.currentGenerating = '正在生成合併報表...';
      
      const calculations = records.map(r => ({
        type: r.type,
        data: r.data || {}
      }));
      
      const doc = await this.pdfGenerator.generateBatchReports(calculations, {
        title: this.reportSettings.title || '批量計算報表'
      });
      
      const filename = `combined_${new Date().toISOString().split('T')[0]}.pdf`;
      await this.pdfGenerator.savePDF(doc, filename);
      this.generatedCount = records.length;
    },
    
    async generatePDF(record) {
      switch (record.type) {
        case 'withholding':
          return await this.pdfGenerator.generateWithholdingReport(record.data || {});
        case 'pit':
          return await this.pdfGenerator.generatePITReport(record.data || {});
        case 'penalty':
          return await this.pdfGenerator.generatePenaltyReport(record.data || {});
        default:
          throw new Error(`未知的計算類型: ${record.type}`);
      }
    },
    
    buildFilename(record, index) {
      let filename = this.reportSettings.filenamePattern;
      
      filename = filename
        .replace('{type}', this.getTypeLabel(record.type))
        .replace('{date}', new Date().toISOString().split('T')[0])
        .replace('{id}', record.id)
        .replace('{index}', index + 1);
      
      return Sanitizer.sanitizeFilename(filename);
    },
    
    async previewReport(record) {
      this.previewRecord = record;
      this.showPreviewModal = true;
      this.previewUrl = null;
      
      try {
        const doc = await this.generatePDF(record);
        const blob = await this.pdfGenerator.getPDFBlob(doc);
        this.previewUrl = URL.createObjectURL(blob);
      } catch (error) {
        console.error('[ReportGenerator] 預覽失敗:', error);
        alert('預覽失敗，請稍後再試');
        this.closePreview();
      }
    },
    
    async downloadPreview() {
      if (!this.previewRecord) return;
      await this.generateSingle(this.previewRecord);
      this.closePreview();
    },
    
    closePreview() {
      this.showPreviewModal = false;
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = null;
      }
      this.previewRecord = null;
    },
    
    getTypeIcon(type) {
      const icons = {
        'withholding': 'pi pi-percentage',
        'pit': 'pi pi-user',
        'cit': 'pi pi-building',
        'penalty': 'pi pi-exclamation-circle'
      };
      return icons[type] || 'pi pi-calculator';
    },
    
    getTypeLabel(type) {
      const labels = {
        'withholding': '扣繳',
        'pit': '綜所稅',
        'cit': '營所稅',
        'penalty': '滯納金'
      };
      return labels[type] || type;
    },
    
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleDateString('zh-TW');
    }
  }
};
</script>

<style scoped>
.report-generator { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.quick-select { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.records-section { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 2rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-header h2 { margin: 0; }
.filters { display: flex; gap: 0.5rem; }
.search-input { padding: 0.5rem 1rem; border: 1px solid #e0e6ed; border-radius: 6px; width: 200px; }
.records-list { max-height: 400px; overflow-y: auto; }
.record-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid #e0e6ed; border-radius: 8px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; }
.record-item:hover { border-color: #667eea; background: #f8f9fa; }
.record-item.selected { border-color: #667eea; background: #f0f4ff; }
.record-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; }
.record-icon.type-withholding { background: #667eea; }
.record-icon.type-pit { background: #f093fb; }
.record-icon.type-cit { background: #4facfe; }
.record-icon.type-penalty { background: #43e97b; }
.record-content { flex: 1; }
.record-content h4 { margin: 0 0 0.25rem 0; color: #2c3e50; }
.record-content p { margin: 0 0 0.25rem 0; color: #7f8c8d; font-size: 0.875rem; }
.record-date { font-size: 0.75rem; color: #95a5a6; }
.record-actions { display: flex; gap: 0.5rem; }
.settings-section { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 2rem; }
.settings-section h2 { margin: 0 0 1.5rem 0; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.setting-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2c3e50; }
.setting-group input[type="text"], .setting-group select { width: 100%; padding: 0.5rem; border: 1px solid #e0e6ed; border-radius: 6px; }
.setting-group small { font-size: 0.75rem; color: #7f8c8d; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: normal !important; }
.progress-section { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.progress-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
.progress-bar { height: 8px; background: #e0e6ed; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.3s; }
.progress-message { margin: 0; color: #7f8c8d; font-size: 0.875rem; }
.preview-modal { max-width: 900px; max-height: 90vh; }
.preview-content { height: 600px; }
.preview-content iframe { width: 100%; height: 100%; }
.loading-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #7f8c8d; }
.loading-preview i { font-size: 3rem; margin-bottom: 1rem; }
.empty-state { text-align: center; padding: 3rem; color: #7f8c8d; }
.empty-state i { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
.icon-btn { background: transparent; border: none; color: #7f8c8d; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: all 0.2s; }
.icon-btn:hover { background: #e0e6ed; color: #2c3e50; }
</style>
