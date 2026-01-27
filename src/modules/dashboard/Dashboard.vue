<template>
  <div class="dashboard">
    <!-- 歡迎區塊 -->
    <div class="welcome-banner">
      <h1>歡迎回來，{{ username }}</h1>
      <p>今天是 {{ currentDate }}</p>
    </div>

    <!-- 快速統計卡片 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in statistics" :key="stat.id">
        <div class="stat-icon" :style="{ background: stat.color }">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stat.value }}</h3>
          <p>{{ stat.label }}</p>
          <span class="stat-trend" :class="stat.trendClass">
            <i :class="stat.trendIcon"></i>
            {{ stat.trend }}
          </span>
        </div>
      </div>
    </div>

    <!-- 快速操作區 -->
    <div class="quick-actions-section">
      <h2><i class="pi pi-bolt"></i> 快速操作</h2>
      <div class="quick-actions-grid">
        <button 
          v-for="action in quickActions" 
          :key="action.id"
          class="quick-action-btn"
          @click="handleQuickAction(action.route)"
        >
          <i :class="action.icon"></i>
          <span>{{ action.label }}</span>
          <small>{{ action.description }}</small>
        </button>
      </div>
    </div>

    <!-- 圖表區域 -->
    <div class="charts-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="pi pi-chart-bar"></i> 本月計算統計</h3>
          <select v-model="selectedPeriod" @change="updateChartData">
            <option value="week">本週</option>
            <option value="month">本月</option>
            <option value="quarter">本季</option>
          </select>
        </div>
        <div class="chart-container">
          <canvas ref="calculationChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="pi pi-chart-pie"></i> 計算類型分布</h3>
        </div>
        <div class="chart-container">
          <canvas ref="distributionChart"></canvas>
        </div>
      </div>
    </div>

    <!-- 最近計算歷史 -->
    <div class="recent-section">
      <div class="section-header">
        <h2><i class="pi pi-history"></i> 最近計算記錄</h2>
        <a href="#/history" class="view-all-link">查看全部 <i class="pi pi-angle-right"></i></a>
      </div>
      <div class="recent-list">
        <div 
          v-for="record in recentRecords" 
          :key="record.id"
          class="recent-item"
          @click="viewRecord(record.id)"
        >
          <div class="recent-icon" :class="`type-${record.type}`">
            <i :class="getTypeIcon(record.type)"></i>
          </div>
          <div class="recent-content">
            <h4>{{ record.title }}</h4>
            <p>{{ record.description }}</p>
            <span class="recent-time">{{ formatTime(record.createdAt) }}</span>
          </div>
          <div class="recent-actions">
            <button class="icon-btn" @click.stop="downloadReport(record.id)" title="下載報表">
              <i class="pi pi-download"></i>
            </button>
            <button class="icon-btn" @click.stop="deleteRecord(record.id)" title="刪除">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="recentRecords.length === 0" class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>尚無計算記錄</p>
          <button class="btn btn-primary" @click="handleQuickAction('/withholding')">
            開始第一次計算
          </button>
        </div>
      </div>
    </div>

    <!-- 系統狀態 -->
    <div class="system-status">
      <div class="status-item">
        <i class="pi pi-database"></i>
        <span>本地儲存: {{ storageUsed }} / {{ storageTotal }}</span>
      </div>
      <div class="status-item">
        <i class="pi pi-clock"></i>
        <span>最後同步: {{ lastSync }}</span>
      </div>
      <div class="status-item" :class="{ 'status-offline': !isOnline }">
        <i :class="isOnline ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
        <span>{{ isOnline ? '線上模式' : '離線模式' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  
  data() {
    return {
      username: '使用者',
      currentDate: new Date().toLocaleDateString('zh-TW', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      }),
      
      statistics: [
        {
          id: 'total',
          label: '總計算次數',
          value: '0',
          trend: '+0%',
          trendClass: 'neutral',
          trendIcon: 'pi pi-minus',
          icon: 'pi pi-calculator',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
          id: 'month',
          label: '本月計算',
          value: '0',
          trend: '+0%',
          trendClass: 'positive',
          trendIcon: 'pi pi-arrow-up',
          icon: 'pi pi-chart-line',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
          id: 'saved',
          label: '已保存報表',
          value: '0',
          trend: '+0',
          trendClass: 'positive',
          trendIcon: 'pi pi-plus',
          icon: 'pi pi-file-pdf',
          color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
          id: 'rules',
          label: '規則庫',
          value: '0',
          trend: '最新',
          trendClass: 'neutral',
          trendIcon: 'pi pi-check',
          icon: 'pi pi-book',
          color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        }
      ],
      
      quickActions: [
        { 
          id: 'withholding', 
          label: '扣繳計算', 
          description: '計算各類所得扣繳稅額',
          icon: 'pi pi-percentage',
          route: '/withholding'
        },
        { 
          id: 'pit', 
          label: '綜所稅', 
          description: '個人綜合所得稅計算',
          icon: 'pi pi-user',
          route: '/pit'
        },
        { 
          id: 'cit', 
          label: '營所稅', 
          description: '營利事業所得稅計算',
          icon: 'pi pi-building',
          route: '/cit'
        },
        { 
          id: 'penalty', 
          label: '滯納金', 
          description: '逾期繳納滯納金計算',
          icon: 'pi pi-exclamation-circle',
          route: '/penalty'
        },
        { 
          id: 'report', 
          label: '生成報表', 
          description: '批量生成 PDF 報表',
          icon: 'pi pi-file-pdf',
          route: '/reports'
        },
        { 
          id: 'rules', 
          label: '規則管理', 
          description: '管理稅務計算規則',
          icon: 'pi pi-cog',
          route: '/rules'
        }
      ],
      
      selectedPeriod: 'month',
      recentRecords: [],
      
      isOnline: navigator.onLine,
      storageUsed: '0 MB',
      storageTotal: '未知',
      lastSync: new Date().toLocaleString('zh-TW'),
      
      calculationChart: null,
      distributionChart: null
    };
  },
  
  mounted() {
    this.loadDashboardData();
    this.initCharts();
    this.checkStorage();
    
    // 監聽網絡狀態
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
  },
  
  beforeUnmount() {
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
    
    // 銷毀圖表
    if (this.calculationChart) this.calculationChart.destroy();
    if (this.distributionChart) this.distributionChart.destroy();
  },
  
  methods: {
    async loadDashboardData() {
      try {
        // 從 IndexedDB 載入統計數據
        const db = await this.openDatabase();
        
        // 載入總計算次數
        const totalCount = await this.getCalculationCount(db);
        this.statistics[0].value = totalCount.toString();
        
        // 載入本月計算
        const monthCount = await this.getMonthCalculationCount(db);
        this.statistics[1].value = monthCount.toString();
        
        // 載入已保存報表數
        const savedCount = await this.getSavedReportCount(db);
        this.statistics[2].value = savedCount.toString();
        
        // 載入規則數量
        const rulesCount = await this.getRulesCount(db);
        this.statistics[3].value = rulesCount.toString();
        
        // 載入最近記錄
        this.recentRecords = await this.getRecentRecords(db, 5);
        
      } catch (error) {
        console.error('[Dashboard] 載入數據失敗:', error);
      }
    },
    
    async openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('AccountingDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    
    async getCalculationCount(db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('calculations', 'readonly');
          const store = tx.objectStore('calculations');
          const request = store.count();
          request.onsuccess = () => resolve(request.result || 0);
          request.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    },
    
    async getMonthCalculationCount(db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('calculations', 'readonly');
          const store = tx.objectStore('calculations');
          const request = store.getAll();
          
          request.onsuccess = () => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const records = request.result || [];
            const monthRecords = records.filter(r => new Date(r.createdAt) >= monthStart);
            resolve(monthRecords.length);
          };
          request.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    },
    
    async getSavedReportCount(db) {
      // 暫時返回 0，實際應從 reports store 計算
      return 0;
    },
    
    async getRulesCount(db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('rules', 'readonly');
          const store = tx.objectStore('rules');
          const request = store.count();
          request.onsuccess = () => resolve(request.result || 0);
          request.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    },
    
    async getRecentRecords(db, limit) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('calculations', 'readonly');
          const store = tx.objectStore('calculations');
          const request = store.getAll();
          
          request.onsuccess = () => {
            const records = request.result || [];
            // 按創建時間排序，取最新的 N 條
            const sorted = records.sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            ).slice(0, limit);
            resolve(sorted);
          };
          request.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
    },
    
    initCharts() {
      // 使用 Chart.js 初始化圖表
      if (window.Chart) {
        this.initCalculationChart();
        this.initDistributionChart();
      } else {
        console.warn('[Dashboard] Chart.js 尚未載入');
      }
    },
    
    initCalculationChart() {
      const ctx = this.$refs.calculationChart?.getContext('2d');
      if (!ctx) return;
      
      this.calculationChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
          datasets: [{
            label: '計算次數',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    },
    
    initDistributionChart() {
      const ctx = this.$refs.distributionChart?.getContext('2d');
      if (!ctx) return;
      
      this.distributionChart = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['扣繳', '綜所稅', '營所稅', '滯納金'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
              '#667eea',
              '#f093fb',
              '#4facfe',
              '#43e97b'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    },
    
    updateChartData() {
      // 根據選擇的時間段更新圖表數據
      // 實際應從 IndexedDB 查詢對應時間段的數據
      console.log('更新圖表數據:', this.selectedPeriod);
    },
    
    async checkStorage() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const used = (estimate.usage / 1024 / 1024).toFixed(2);
          const total = (estimate.quota / 1024 / 1024).toFixed(0);
          this.storageUsed = `${used} MB`;
          this.storageTotal = `${total} MB`;
        } catch (error) {
          console.error('檢查儲存空間失敗:', error);
        }
      }
    },
    
    handleQuickAction(route) {
      this.$router?.push(route);
    },
    
    viewRecord(id) {
      this.$router?.push(`/history/${id}`);
    },
    
    async downloadReport(id) {
      // 實現下載報表功能
      console.log('下載報表:', id);
    },
    
    async deleteRecord(id) {
      if (confirm('確定要刪除此記錄嗎？')) {
        try {
          const db = await this.openDatabase();
          const tx = db.transaction('calculations', 'readwrite');
          const store = tx.objectStore('calculations');
          await store.delete(id);
          
          // 重新載入數據
          await this.loadDashboardData();
        } catch (error) {
          console.error('刪除記錄失敗:', error);
          alert('刪除失敗，請稍後再試');
        }
      }
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
    
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return '剛剛';
      if (minutes < 60) return `${minutes} 分鐘前`;
      if (hours < 24) return `${hours} 小時前`;
      if (days < 7) return `${days} 天前`;
      
      return date.toLocaleDateString('zh-TW');
    },
    
    updateOnlineStatus() {
      this.isOnline = navigator.onLine;
    }
  }
};
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.welcome-banner h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.welcome-banner p {
  margin: 0;
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.stat-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 2rem;
  color: #2c3e50;
}

.stat-content p {
  margin: 0 0 0.5rem 0;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.stat-trend {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-trend.positive {
  background: #d4edda;
  color: #155724;
}

.stat-trend.negative {
  background: #f8d7da;
  color: #721c24;
}

.stat-trend.neutral {
  background: #e2e3e5;
  color: #383d41;
}

.quick-actions-section {
  margin-bottom: 2rem;
}

.quick-actions-section h2 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.quick-action-btn {
  background: white;
  border: 2px solid #e0e6ed;
  padding: 1.5rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.quick-action-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.quick-action-btn i {
  font-size: 2rem;
  color: #667eea;
}

.quick-action-btn span {
  font-weight: 600;
  color: #2c3e50;
}

.quick-action-btn small {
  color: #7f8c8d;
  font-size: 0.75rem;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  margin: 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chart-header select {
  padding: 0.5rem;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  font-size: 0.875rem;
}

.chart-container {
  height: 250px;
  position: relative;
}

.recent-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-all-link {
  color: #667eea;
  text-decoration: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.view-all-link:hover {
  text-decoration: underline;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-item:hover {
  border-color: #667eea;
  background: #f8f9fa;
}

.recent-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.recent-icon.type-withholding { background: #667eea; }
.recent-icon.type-pit { background: #f093fb; }
.recent-icon.type-cit { background: #4facfe; }
.recent-icon.type-penalty { background: #43e97b; }

.recent-content {
  flex: 1;
}

.recent-content h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.recent-content p {
  margin: 0 0 0.25rem 0;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.recent-time {
  font-size: 0.75rem;
  color: #95a5a6;
}

.recent-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #e0e6ed;
  color: #2c3e50;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #7f8c8d;
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin-bottom: 1rem;
}

.system-status {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #7f8c8d;
}

.status-item i {
  color: #43e97b;
}

.status-item.status-offline i {
  color: #e74c3c;
}

@media (max-width: 768px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .system-status {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
