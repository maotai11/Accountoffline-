<template>
  <div class="main-layout">
    <!-- 側邊欄 -->
    <aside class="sidebar">
      <div class="logo">
        <h1>📊 會計系統</h1>
      </div>
      
      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <i class="pi pi-home"></i>
          <span>儀表板</span>
        </router-link>
        
        <router-link to="/ocr-batch" class="nav-item" active-class="active">
          <i class="pi pi-images"></i>
          <span>OCR 批量識別</span>
        </router-link>
        
        <router-link to="/invoice-manage" class="nav-item" active-class="active">
          <i class="pi pi-file"></i>
          <span>發票管理</span>
        </router-link>
        
        <router-link to="/reports" class="nav-item" active-class="active">
          <i class="pi pi-chart-bar"></i>
          <span>報表分析</span>
        </router-link>
        
        <router-link to="/settings" class="nav-item" active-class="active">
          <i class="pi pi-cog"></i>
          <span>系統設置</span>
        </router-link>
      </nav>
      
      <div class="sidebar-footer">
        <div class="user-info">
          <i class="pi pi-user"></i>
          <span>管理員</span>
        </div>
      </div>
    </aside>
    
    <!-- 主內容區 -->
    <main class="main-content">
      <header class="content-header">
        <div class="breadcrumb">
          <i class="pi pi-home"></i>
          <span>/ {{ currentRouteName }}</span>
        </div>
        
        <div class="header-actions">
          <button class="icon-btn" title="通知">
            <i class="pi pi-bell"></i>
          </button>
          <button class="icon-btn" title="幫助">
            <i class="pi pi-question-circle"></i>
          </button>
        </div>
      </header>
      
      <div class="content-body">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'MainLayout',
  
  computed: {
    currentRouteName() {
      const routeNames = {
        '/': '儀表板',
        '/ocr-batch': 'OCR 批量識別',
        '/invoice-manage': '發票管理',
        '/reports': '報表分析',
        '/settings': '系統設置'
      };
      return routeNames[this.$route.path] || '未知頁面';
    }
  }
};
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

/* 側邊欄樣式 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.logo {
  padding: 30px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.nav-menu {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 25px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(52, 152, 219, 0.2);
  color: white;
  border-left-color: #3498db;
}

.nav-item i {
  margin-right: 12px;
  font-size: 18px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 主內容區樣式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  background: white;
  padding: 15px 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s;
}

.icon-btn:hover {
  background: #f0f0f0;
  color: #3498db;
}

.content-body {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

/* 滾動條美化 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
