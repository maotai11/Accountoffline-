<template>
  <div class="main-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- 側邊欄 -->
    <aside class="sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo" v-if="!sidebarCollapsed">
          <i class="pi pi-calculator"></i>
          <span>會計內控系統</span>
        </div>
        <div class="logo-collapsed" v-else>
          <i class="pi pi-calculator"></i>
        </div>
        <button 
          class="toggle-btn" 
          @click="toggleSidebar"
          :title="sidebarCollapsed ? '展開側邊欄' : '收合側邊欄'"
        >
          <i :class="sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"></i>
        </button>
      </div>

      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li 
            v-for="item in menuItems" 
            :key="item.path"
            :class="{ 'active': isActive(item.path) }"
          >
            <a 
              :href="`#${item.path}`" 
              @click.prevent="navigate(item.path)"
              :title="sidebarCollapsed ? item.label : ''"
            >
              <i :class="item.icon"></i>
              <span v-if="!sidebarCollapsed">{{ item.label }}</span>
              <span v-if="item.badge && !sidebarCollapsed" class="badge">{{ item.badge }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" v-if="!sidebarCollapsed">
          <i class="pi pi-user"></i>
          <span>{{ username }}</span>
        </div>
        <div class="user-info-collapsed" v-else>
          <i class="pi pi-user"></i>
        </div>
        
        <button class="settings-btn" @click="openSettings" :title="sidebarCollapsed ? '設定' : ''">
          <i class="pi pi-cog"></i>
          <span v-if="!sidebarCollapsed">設定</span>
        </button>
      </div>
    </aside>

    <!-- 主內容區 -->
    <main class="main-content">
      <!-- 頂部導航欄 -->
      <header class="top-bar">
        <div class="breadcrumb">
          <span v-for="(crumb, index) in breadcrumbs" :key="index">
            <a v-if="crumb.path" :href="`#${crumb.path}`" @click.prevent="navigate(crumb.path)">
              {{ crumb.label }}
            </a>
            <span v-else>{{ crumb.label }}</span>
            <i v-if="index < breadcrumbs.length - 1" class="pi pi-angle-right"></i>
          </span>
        </div>

        <div class="top-bar-actions">
          <!-- 搜尋 -->
          <div class="search-box">
            <i class="pi pi-search"></i>
            <input 
              type="text" 
              v-model="searchQuery"
              placeholder="搜尋..."
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- 通知 -->
          <button class="icon-btn" @click="showNotifications" title="通知">
            <i class="pi pi-bell"></i>
            <span v-if="notificationCount > 0" class="notification-badge">{{ notificationCount }}</span>
          </button>

          <!-- 離線狀態 -->
          <div class="status-indicator" :class="{ 'offline': !isOnline }">
            <i :class="isOnline ? 'pi pi-wifi' : 'pi pi-exclamation-triangle'"></i>
            <span>{{ isOnline ? '線上' : '離線' }}</span>
          </div>
        </div>
      </header>

      <!-- 內容區域 -->
      <div class="content-wrapper">
        <slot></slot>
      </div>

      <!-- 頁腳 -->
      <footer class="footer">
        <div class="footer-content">
          <span>&copy; 2025 會計事務所內控作業系統</span>
          <span>版本 1.0.0</span>
          <span>最後同步: {{ lastSyncTime }}</span>
        </div>
      </footer>
    </main>

    <!-- 設定面板（Modal） -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="closeSettings">
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h3><i class="pi pi-cog"></i> 系統設定</h3>
          <button class="close-btn" @click="closeSettings">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <h4>主題設定</h4>
            <label>
              <input type="radio" v-model="theme" value="light" @change="updateTheme" />
              <span>淺色模式</span>
            </label>
            <label>
              <input type="radio" v-model="theme" value="dark" @change="updateTheme" />
              <span>深色模式</span>
            </label>
          </div>

          <div class="settings-section">
            <h4>語言設定</h4>
            <select v-model="language" @change="updateLanguage">
              <option value="zh-TW">繁體中文</option>
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div class="settings-section">
            <h4>快取管理</h4>
            <button class="btn btn-secondary" @click="clearCache">
              <i class="pi pi-trash"></i> 清除快取
            </button>
            <p class="help-text">清除所有本地緩存數據（不影響已保存的計算記錄）</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MainLayout',
  
  data() {
    return {
      sidebarCollapsed: false,
      showSettingsModal: false,
      searchQuery: '',
      notificationCount: 0,
      isOnline: navigator.onLine,
      username: '使用者',
      theme: 'light',
      language: 'zh-TW',
      lastSyncTime: new Date().toLocaleString('zh-TW'),
      
      menuItems: [
        { path: '/', label: '儀表板', icon: 'pi pi-th-large' },
        { path: '/calculations', label: '稅務計算', icon: 'pi pi-calculator', badge: null },
        { path: '/withholding', label: '扣繳計算', icon: 'pi pi-percentage' },
        { path: '/pit', label: '綜所稅', icon: 'pi pi-chart-line' },
        { path: '/cit', label: '營所稅', icon: 'pi pi-building' },
        { path: '/penalty', label: '滯納金', icon: 'pi pi-exclamation-circle' },
        { path: '/ocr-batch', label: 'OCR 批量識別', icon: 'pi pi-images' },
        { path: '/reports', label: '報表生成', icon: 'pi pi-file-pdf' },
        { path: '/rules', label: '規則管理', icon: 'pi pi-book' },
        { path: '/history', label: '計算歷史', icon: 'pi pi-history' }
      ],
      
      breadcrumbs: [
        { label: '首頁', path: '/' }
      ]
    };
  },
  
  mounted() {
    // 監聽網絡狀態
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
    
    // 從 localStorage 讀取設定
    this.loadSettings();
    
    // 定期更新同步時間
    setInterval(() => {
      this.lastSyncTime = new Date().toLocaleString('zh-TW');
    }, 60000); // 每分鐘更新
  },
  
  beforeUnmount() {
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
  },
  
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    },
    
    navigate(path) {
      this.$router?.push(path);
      this.updateBreadcrumbs(path);
    },
    
    isActive(path) {
      return this.$route?.path === path;
    },
    
    updateBreadcrumbs(path) {
      const item = this.menuItems.find(m => m.path === path);
      if (item) {
        this.breadcrumbs = [
          { label: '首頁', path: '/' },
          { label: item.label, path: null }
        ];
      }
    },
    
    handleSearch() {
      if (this.searchQuery.trim()) {
        this.$emit('search', this.searchQuery);
      }
    },
    
    showNotifications() {
      this.$emit('show-notifications');
    },
    
    updateOnlineStatus() {
      this.isOnline = navigator.onLine;
    },
    
    openSettings() {
      this.showSettingsModal = true;
    },
    
    closeSettings() {
      this.showSettingsModal = false;
    },
    
    updateTheme() {
      document.documentElement.setAttribute('data-theme', this.theme);
      localStorage.setItem('theme', this.theme);
    },
    
    updateLanguage() {
      localStorage.setItem('language', this.language);
      // 觸發語言切換事件
      this.$emit('language-change', this.language);
    },
    
    async clearCache() {
      if (confirm('確定要清除所有快取嗎？此操作不可復原。')) {
        try {
          // 清除 Service Worker 快取
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          
          alert('快取已清除！頁面將重新載入。');
          window.location.reload();
        } catch (error) {
          console.error('清除快取失敗:', error);
          alert('清除快取失敗，請稍後再試。');
        }
      }
    },
    
    loadSettings() {
      // 讀取側邊欄狀態
      const collapsed = localStorage.getItem('sidebarCollapsed');
      if (collapsed !== null) {
        this.sidebarCollapsed = collapsed === 'true';
      }
      
      // 讀取主題
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        this.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', this.theme);
      }
      
      // 讀取語言
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage) {
        this.language = savedLanguage;
      }
      
      // 讀取使用者名稱
      const savedUsername = localStorage.getItem('username');
      if (savedUsername) {
        this.username = savedUsername;
      }
    }
  }
};
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 側邊欄 */
.sidebar {
  width: 250px;
  background: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  z-index: 1000;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: bold;
}

.logo i {
  font-size: 1.5rem;
  color: #3498db;
}

.logo-collapsed {
  text-align: center;
  width: 100%;
}

.logo-collapsed i {
  font-size: 1.5rem;
  color: #3498db;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #ecf0f1;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 導航 */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  margin: 0.25rem 0;
}

.nav-list a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #ecf0f1;
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
}

.sidebar.collapsed .nav-list a {
  justify-content: center;
  padding: 0.75rem 0;
}

.nav-list a:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-list li.active a {
  background: #3498db;
  color: white;
}

.nav-list a i {
  font-size: 1.25rem;
  min-width: 1.25rem;
}

.badge {
  background: #e74c3c;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  margin-left: auto;
}

/* 側邊欄頁腳 */
.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
}

.user-info, .user-info-collapsed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.user-info-collapsed {
  justify-content: center;
}

.settings-btn {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ecf0f1;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #3498db;
}

/* 主內容區 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

/* 頂部欄 */
.top-bar {
  background: white;
  border-bottom: 1px solid #e0e6ed;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.breadcrumb a {
  color: #3498db;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  color: #95a5a6;
}

.search-box input {
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #e0e6ed;
  border-radius: 20px;
  font-size: 0.875rem;
  width: 200px;
  transition: width 0.3s, border-color 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: #3498db;
  width: 250px;
}

.icon-btn {
  position: relative;
  background: transparent;
  border: none;
  color: #7f8c8d;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f0f3f7;
  color: #2c3e50;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #e74c3c;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: #d4edda;
  color: #155724;
  font-size: 0.875rem;
}

.status-indicator.offline {
  background: #f8d7da;
  color: #721c24;
}

/* 內容包裝器 */
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 頁腳 */
.footer {
  background: white;
  border-top: 1px solid #e0e6ed;
  padding: 1rem 1.5rem;
  text-align: center;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #7f8c8d;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: #7f8c8d;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.settings-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.settings-section label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.settings-section select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e6ed;
  border-radius: 4px;
  font-size: 0.875rem;
}

.help-text {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #7f8c8d;
}

/* 響應式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1001;
    transform: translateX(-100%);
  }
  
  .sidebar.collapsed {
    transform: translateX(0);
    width: 70px;
  }
  
  .main-content {
    width: 100%;
  }
  
  .search-box input {
    width: 150px;
  }
  
  .search-box input:focus {
    width: 180px;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
