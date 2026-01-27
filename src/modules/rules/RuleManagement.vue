<template>
  <div class="rule-management">
    <div class="page-header">
      <h1><i class="pi pi-book"></i> 稅務規則管理</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="showImportModal = true">
          <i class="pi pi-upload"></i> 匯入 PDF
        </button>
        <button class="btn btn-primary" @click="showAddModal = true">
          <i class="pi pi-plus"></i> 新增規則
        </button>
      </div>
    </div>

    <!-- 搜尋與篩選 -->
    <div class="filter-bar">
      <div class="search-box">
        <i class="pi pi-search"></i>
        <input 
          type="text" 
          v-model="searchQuery"
          placeholder="搜尋規則名稱、法規依據..."
          @input="handleSearch"
        />
      </div>
      
      <select v-model="filterCategory" @change="handleFilter">
        <option value="">全部類別</option>
        <option value="withholding">扣繳規則</option>
        <option value="pit">綜所稅規則</option>
        <option value="cit">營所稅規則</option>
        <option value="penalty">滯納金規則</option>
        <option value="nhi">二代健保規則</option>
      </select>

      <select v-model="filterYear" @change="handleFilter">
        <option value="">全部年度</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
        <option value="2023">2023</option>
      </select>

      <button class="btn btn-outline" @click="exportRules">
        <i class="pi pi-download"></i> 匯出規則
      </button>
    </div>

    <!-- 規則列表 -->
    <div class="rules-grid">
      <div 
        v-for="rule in filteredRules" 
        :key="rule.id"
        class="rule-card"
        @click="viewRule(rule)"
      >
        <div class="rule-header">
          <span class="rule-category" :class="`category-${rule.category}`">
            {{ getCategoryLabel(rule.category) }}
          </span>
          <span class="rule-year">{{ rule.year }}年</span>
        </div>
        
        <h3>{{ rule.name }}</h3>
        <p class="rule-description">{{ rule.description }}</p>
        
        <div class="rule-meta">
          <span><i class="pi pi-calendar"></i> 生效: {{ formatDate(rule.effectiveDate) }}</span>
          <span v-if="rule.endDate"><i class="pi pi-calendar"></i> 失效: {{ formatDate(rule.endDate) }}</span>
        </div>

        <div class="rule-footer">
          <span class="rule-source" v-if="rule.source === 'pdf'">
            <i class="pi pi-file-pdf"></i> PDF 匯入
          </span>
          <span class="rule-source" v-else>
            <i class="pi pi-pencil"></i> 手動建立
          </span>
          
          <div class="rule-actions" @click.stop>
            <button class="icon-btn" @click="editRule(rule)" title="編輯">
              <i class="pi pi-pencil"></i>
            </button>
            <button class="icon-btn" @click="duplicateRule(rule)" title="複製">
              <i class="pi pi-copy"></i>
            </button>
            <button class="icon-btn danger" @click="deleteRule(rule)" title="刪除">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredRules.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>沒有符合條件的規則</p>
        <button class="btn btn-primary" @click="showAddModal = true">
          新增第一條規則
        </button>
      </div>
    </div>

    <!-- 新增/編輯規則 Modal -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <i class="pi pi-book"></i>
            {{ showEditModal ? '編輯規則' : '新增規則' }}
          </h3>
          <button class="close-btn" @click="closeModals">
            <i class="pi pi-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveRule">
            <div class="form-group">
              <label class="required">規則名稱</label>
              <input 
                type="text" 
                v-model="formData.name"
                placeholder="例如：薪資所得扣繳率 5%"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="required">類別</label>
                <select v-model="formData.category" required>
                  <option value="">請選擇</option>
                  <option value="withholding">扣繳規則</option>
                  <option value="pit">綜所稅規則</option>
                  <option value="cit">營所稅規則</option>
                  <option value="penalty">滯納金規則</option>
                  <option value="nhi">二代健保規則</option>
                </select>
              </div>

              <div class="form-group">
                <label class="required">適用年度</label>
                <input 
                  type="number" 
                  v-model.number="formData.year"
                  min="2020"
                  max="2030"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label>規則說明</label>
              <textarea 
                v-model="formData.description"
                rows="3"
                placeholder="詳細說明此規則的適用情境與計算方式..."
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="required">生效日期</label>
                <input 
                  type="date" 
                  v-model="formData.effectiveDate"
                  required
                />
              </div>

              <div class="form-group">
                <label>失效日期</label>
                <input 
                  type="date" 
                  v-model="formData.endDate"
                />
              </div>
            </div>

            <div class="form-group">
              <label>法律依據</label>
              <textarea 
                v-model="formData.legalBasis"
                rows="2"
                placeholder="例如：所得稅法第88條第1項..."
              ></textarea>
            </div>

            <div class="form-group">
              <label>規則內容 (JSON)</label>
              <textarea 
                v-model="formData.ruleContent"
                rows="5"
                placeholder='{"rate": 5, "threshold": 0, "type": "percentage"}'
                @blur="validateJSON"
              ></textarea>
              <span v-if="jsonError" class="error-text">{{ jsonError }}</span>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeModals">
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                {{ showEditModal ? '更新' : '新增' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- PDF 匯入 Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="pi pi-upload"></i> 匯入 PDF 規則文件</h3>
          <button class="close-btn" @click="closeModals">
            <i class="pi pi-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="upload-area" @drop.prevent="handleDrop" @dragover.prevent>
            <input 
              type="file" 
              ref="fileInput"
              accept=".pdf"
              @change="handleFileSelect"
              style="display: none"
            />
            
            <div class="upload-placeholder" @click="$refs.fileInput.click()">
              <i class="pi pi-cloud-upload"></i>
              <p>點擊或拖曳 PDF 文件到此處</p>
              <small>支援 PDF 格式，最大 50MB</small>
            </div>

            <div v-if="uploadedFile" class="uploaded-file">
              <i class="pi pi-file-pdf"></i>
              <span>{{ uploadedFile.name }}</span>
              <button class="icon-btn" @click="removeFile">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <div v-if="parsing" class="parsing-status">
            <i class="pi pi-spin pi-spinner"></i>
            <span>正在解析 PDF...</span>
          </div>

          <div v-if="parsedRules.length > 0" class="parsed-results">
            <h4>解析結果（{{ parsedRules.length }} 條規則）</h4>
            <div class="parsed-list">
              <div v-for="(rule, index) in parsedRules" :key="index" class="parsed-item">
                <input type="checkbox" v-model="rule.selected" :id="`rule-${index}`" />
                <label :for="`rule-${index}`">
                  <strong>{{ rule.type }}</strong>
                  <span>{{ rule.content }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" @click="closeModals">取消</button>
            <button 
              class="btn btn-primary" 
              @click="parsePDF"
              :disabled="!uploadedFile || parsing"
            >
              <i class="pi pi-search"></i> 解析 PDF
            </button>
            <button 
              class="btn btn-primary" 
              @click="importParsedRules"
              :disabled="parsedRules.length === 0"
            >
              <i class="pi pi-check"></i> 匯入選中規則
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看規則詳情 Modal -->
    <div v-if="showViewModal && selectedRule" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="pi pi-eye"></i> 規則詳情</h3>
          <button class="close-btn" @click="closeModals">
            <i class="pi pi-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="detail-section">
            <h4>基本資訊</h4>
            <dl>
              <dt>規則名稱</dt>
              <dd>{{ selectedRule.name }}</dd>
              
              <dt>類別</dt>
              <dd>{{ getCategoryLabel(selectedRule.category) }}</dd>
              
              <dt>適用年度</dt>
              <dd>{{ selectedRule.year }}</dd>
              
              <dt>生效日期</dt>
              <dd>{{ formatDate(selectedRule.effectiveDate) }}</dd>
              
              <dt v-if="selectedRule.endDate">失效日期</dt>
              <dd v-if="selectedRule.endDate">{{ formatDate(selectedRule.endDate) }}</dd>
            </dl>
          </div>

          <div class="detail-section" v-if="selectedRule.description">
            <h4>規則說明</h4>
            <p>{{ selectedRule.description }}</p>
          </div>

          <div class="detail-section" v-if="selectedRule.legalBasis">
            <h4>法律依據</h4>
            <p>{{ selectedRule.legalBasis }}</p>
          </div>

          <div class="detail-section" v-if="selectedRule.content">
            <h4>規則內容</h4>
            <pre>{{ formatJSON(selectedRule.content) }}</pre>
          </div>

          <div class="detail-section">
            <h4>元數據</h4>
            <dl>
              <dt>建立時間</dt>
              <dd>{{ formatDateTime(selectedRule.createdAt) }}</dd>
              
              <dt>更新時間</dt>
              <dd>{{ formatDateTime(selectedRule.updatedAt) }}</dd>
              
              <dt>來源</dt>
              <dd>{{ selectedRule.source === 'pdf' ? 'PDF 匯入' : '手動建立' }}</dd>
            </dl>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" @click="closeModals">關閉</button>
            <button class="btn btn-primary" @click="editRule(selectedRule)">
              <i class="pi pi-pencil"></i> 編輯
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Sanitizer from '../../utils/sanitizer.js';
import PDFParser from '../../core/engines/pdf/PDFParser.js';

export default {
  name: 'RuleManagement',
  
  data() {
    return {
      rules: [],
      filteredRules: [],
      searchQuery: '',
      filterCategory: '',
      filterYear: '',
      
      showAddModal: false,
      showEditModal: false,
      showImportModal: false,
      showViewModal: false,
      
      selectedRule: null,
      
      formData: {
        name: '',
        category: '',
        year: new Date().getFullYear(),
        description: '',
        effectiveDate: '',
        endDate: '',
        legalBasis: '',
        ruleContent: ''
      },
      
      jsonError: '',
      
      uploadedFile: null,
      parsing: false,
      parsedRules: [],
      
      pdfParser: null
    };
  },
  
  mounted() {
    this.loadRules();
    this.pdfParser = new PDFParser();
  },
  
  methods: {
    async loadRules() {
      try {
        const db = await this.openDatabase();
        const tx = db.transaction('rules', 'readonly');
        const store = tx.objectStore('rules');
        const request = store.getAll();
        
        request.onsuccess = () => {
          this.rules = request.result || [];
          this.filteredRules = this.rules;
        };
      } catch (error) {
        console.error('[RuleManagement] 載入規則失敗:', error);
      }
    },
    
    async openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('AccountingDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    
    handleSearch() {
      this.applyFilters();
    },
    
    handleFilter() {
      this.applyFilters();
    },
    
    applyFilters() {
      let filtered = this.rules;
      
      // 搜尋過濾
      if (this.searchQuery) {
        const query = Sanitizer.escapeHTML(this.searchQuery.toLowerCase());
        filtered = filtered.filter(rule => 
          rule.name.toLowerCase().includes(query) ||
          rule.description?.toLowerCase().includes(query) ||
          rule.legalBasis?.toLowerCase().includes(query)
        );
      }
      
      // 類別過濾
      if (this.filterCategory) {
        filtered = filtered.filter(rule => rule.category === this.filterCategory);
      }
      
      // 年度過濾
      if (this.filterYear) {
        filtered = filtered.filter(rule => rule.year == this.filterYear);
      }
      
      this.filteredRules = filtered;
    },
    
    async saveRule() {
      try {
        // 驗證 JSON
        if (this.formData.ruleContent) {
          try {
            JSON.parse(this.formData.ruleContent);
          } catch {
            this.jsonError = '規則內容必須是有效的 JSON 格式';
            return;
          }
        }
        
        // 消毒輸入數據
        const sanitizedData = {
          name: Sanitizer.escapeHTML(this.formData.name),
          category: this.formData.category,
          year: Sanitizer.sanitizeInteger(this.formData.year),
          description: Sanitizer.escapeHTML(this.formData.description),
          effectiveDate: Sanitizer.sanitizeDate(this.formData.effectiveDate).toISOString(),
          endDate: this.formData.endDate ? Sanitizer.sanitizeDate(this.formData.endDate).toISOString() : null,
          legalBasis: Sanitizer.escapeHTML(this.formData.legalBasis),
          content: this.formData.ruleContent ? JSON.parse(this.formData.ruleContent) : {},
          source: 'manual',
          updatedAt: new Date().toISOString()
        };
        
        const db = await this.openDatabase();
        const tx = db.transaction('rules', 'readwrite');
        const store = tx.objectStore('rules');
        
        if (this.showEditModal && this.selectedRule) {
          // 更新
          sanitizedData.id = this.selectedRule.id;
          sanitizedData.createdAt = this.selectedRule.createdAt;
          await store.put(sanitizedData);
        } else {
          // 新增
          sanitizedData.id = `rule_${Date.now()}`;
          sanitizedData.createdAt = new Date().toISOString();
          await store.add(sanitizedData);
        }
        
        this.closeModals();
        await this.loadRules();
        
      } catch (error) {
        console.error('[RuleManagement] 儲存規則失敗:', error);
        alert('儲存失敗，請稍後再試');
      }
    },
    
    editRule(rule) {
      this.selectedRule = rule;
      this.formData = {
        name: rule.name,
        category: rule.category,
        year: rule.year,
        description: rule.description || '',
        effectiveDate: rule.effectiveDate ? rule.effectiveDate.split('T')[0] : '',
        endDate: rule.endDate ? rule.endDate.split('T')[0] : '',
        legalBasis: rule.legalBasis || '',
        ruleContent: rule.content ? JSON.stringify(rule.content, null, 2) : ''
      };
      this.showEditModal = true;
    },
    
    async duplicateRule(rule) {
      this.formData = {
        name: `${rule.name} (複製)`,
        category: rule.category,
        year: rule.year,
        description: rule.description || '',
        effectiveDate: rule.effectiveDate ? rule.effectiveDate.split('T')[0] : '',
        endDate: rule.endDate ? rule.endDate.split('T')[0] : '',
        legalBasis: rule.legalBasis || '',
        ruleContent: rule.content ? JSON.stringify(rule.content, null, 2) : ''
      };
      this.showAddModal = true;
    },
    
    async deleteRule(rule) {
      if (!confirm(`確定要刪除「${rule.name}」嗎？`)) return;
      
      try {
        const db = await this.openDatabase();
        const tx = db.transaction('rules', 'readwrite');
        const store = tx.objectStore('rules');
        await store.delete(rule.id);
        
        await this.loadRules();
      } catch (error) {
        console.error('[RuleManagement] 刪除規則失敗:', error);
        alert('刪除失敗，請稍後再試');
      }
    },
    
    viewRule(rule) {
      this.selectedRule = rule;
      this.showViewModal = true;
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file && this.pdfParser.isValidPDF(file)) {
        this.uploadedFile = file;
      } else {
        alert('請選擇有效的 PDF 文件（最大 50MB）');
      }
    },
    
    handleDrop(event) {
      const file = event.dataTransfer.files[0];
      if (file && this.pdfParser.isValidPDF(file)) {
        this.uploadedFile = file;
      } else {
        alert('請選擇有效的 PDF 文件（最大 50MB）');
      }
    },
    
    removeFile() {
      this.uploadedFile = null;
      this.parsedRules = [];
    },
    
    async parsePDF() {
      if (!this.uploadedFile) return;
      
      this.parsing = true;
      this.parsedRules = [];
      
      try {
        const result = await this.pdfParser.parsePDF(this.uploadedFile);
        
        if (result.success && result.extractedRules) {
          this.parsedRules = result.extractedRules.map((rule, index) => ({
            ...rule,
            selected: true,
            id: `parsed_${index}`
          }));
        } else {
          alert('PDF 解析失敗，請檢查文件格式');
        }
      } catch (error) {
        console.error('[RuleManagement] PDF 解析失敗:', error);
        alert('解析失敗，請稍後再試');
      } finally {
        this.parsing = false;
      }
    },
    
    async importParsedRules() {
      const selected = this.parsedRules.filter(r => r.selected);
      if (selected.length === 0) {
        alert('請至少選擇一條規則');
        return;
      }
      
      try {
        const db = await this.openDatabase();
        const tx = db.transaction('rules', 'readwrite');
        const store = tx.objectStore('rules');
        
        for (const rule of selected) {
          const ruleData = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: Sanitizer.escapeHTML(rule.content || rule.type),
            category: 'withholding', // 預設類別
            year: new Date().getFullYear(),
            description: Sanitizer.escapeHTML(rule.content || ''),
            effectiveDate: new Date().toISOString(),
            endDate: null,
            legalBasis: '',
            content: rule,
            source: 'pdf',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await store.add(ruleData);
        }
        
        alert(`成功匯入 ${selected.length} 條規則`);
        this.closeModals();
        await this.loadRules();
        
      } catch (error) {
        console.error('[RuleManagement] 匯入規則失敗:', error);
        alert('匯入失敗，請稍後再試');
      }
    },
    
    async exportRules() {
      try {
        const dataStr = JSON.stringify(this.filteredRules, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tax_rules_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('[RuleManagement] 匯出規則失敗:', error);
        alert('匯出失敗，請稍後再試');
      }
    },
    
    validateJSON() {
      this.jsonError = '';
      if (!this.formData.ruleContent) return;
      
      try {
        JSON.parse(this.formData.ruleContent);
      } catch (error) {
        this.jsonError = `JSON 格式錯誤: ${error.message}`;
      }
    },
    
    closeModals() {
      this.showAddModal = false;
      this.showEditModal = false;
      this.showImportModal = false;
      this.showViewModal = false;
      this.selectedRule = null;
      this.jsonError = '';
      this.uploadedFile = null;
      this.parsedRules = [];
      
      this.formData = {
        name: '',
        category: '',
        year: new Date().getFullYear(),
        description: '',
        effectiveDate: '',
        endDate: '',
        legalBasis: '',
        ruleContent: ''
      };
    },
    
    getCategoryLabel(category) {
      const labels = {
        'withholding': '扣繳規則',
        'pit': '綜所稅規則',
        'cit': '營所稅規則',
        'penalty': '滯納金規則',
        'nhi': '二代健保規則'
      };
      return labels[category] || category;
    },
    
    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('zh-TW');
    },
    
    formatDateTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('zh-TW');
    },
    
    formatJSON(obj) {
      return JSON.stringify(obj, null, 2);
    }
  }
};
</script>

<style scoped>
/* 樣式省略，與之前組件類似的風格 */
.rule-management { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-actions { display: flex; gap: 1rem; }
.filter-bar { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
.search-box { position: relative; flex: 1; min-width: 250px; }
.search-box i { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #95a5a6; }
.search-box input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid #e0e6ed; border-radius: 8px; }
.rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.rule-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s; }
.rule-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.rule-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
.rule-category { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.category-withholding { background: #e3f2fd; color: #1976d2; }
.category-pit { background: #f3e5f5; color: #7b1fa2; }
.category-cit { background: #e8f5e9; color: #388e3c; }
.category-penalty { background: #fff3e0; color: #f57c00; }
.category-nhi { background: #fce4ec; color: #c2185b; }
.rule-year { font-size: 0.875rem; color: #7f8c8d; }
.rule-card h3 { margin: 0 0 0.5rem 0; color: #2c3e50; }
.rule-description { color: #7f8c8d; font-size: 0.875rem; margin: 0 0 1rem 0; }
.rule-meta { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: #95a5a6; margin-bottom: 1rem; }
.rule-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #e0e6ed; }
.rule-source { font-size: 0.75rem; color: #7f8c8d; display: flex; align-items: center; gap: 0.25rem; }
.rule-actions { display: flex; gap: 0.5rem; }
.icon-btn { background: transparent; border: none; color: #7f8c8d; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: all 0.2s; }
.icon-btn:hover { background: #f0f3f7; color: #2c3e50; }
.icon-btn.danger:hover { background: #fee; color: #e74c3c; }
.upload-area { border: 2px dashed #e0e6ed; border-radius: 8px; padding: 2rem; text-align: center; }
.upload-placeholder { cursor: pointer; }
.upload-placeholder i { font-size: 3rem; color: #95a5a6; margin-bottom: 1rem; }
.uploaded-file { display: flex; align-items: center; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
.parsing-status { text-align: center; padding: 1rem; color: #667eea; }
.parsed-results { margin-top: 1.5rem; }
.parsed-list { max-height: 300px; overflow-y: auto; }
.parsed-item { display: flex; gap: 0.5rem; padding: 0.75rem; border: 1px solid #e0e6ed; border-radius: 4px; margin-bottom: 0.5rem; }
.detail-section { margin-bottom: 1.5rem; }
.detail-section h4 { margin: 0 0 1rem 0; color: #2c3e50; }
.detail-section dl { margin: 0; }
.detail-section dt { font-weight: 600; color: #7f8c8d; margin-bottom: 0.25rem; }
.detail-section dd { margin: 0 0 1rem 0; color: #2c3e50; }
.detail-section pre { background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
.error-text { color: #e74c3c; font-size: 0.75rem; }
</style>
