/**
 * 應用入口文件（簡化版 - 移除外部依賴）
 * 初始化 Vue 應用、路由、狀態管理
 */

const { createApp } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;
const { createPinia } = Pinia;

// ========== 內聯路由定義 ==========
const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: { 
      template: `
        <div style="padding: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">📊 儀表板</h1>
          <p style="color: #7f8c8d;">系統初始化完成，準備就緒。</p>
        </div>
      ` 
    }
  },
  {
    path: '/ocr-batch',
    name: 'BatchOCR',
    component: { 
      template: `
        <div style="padding: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">🖼️ OCR 批量識別</h1>
          <p style="color: #7f8c8d;">功能開發中，請稍後...</p>
        </div>
      ` 
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// ========== 創建 Vue 應用 ==========
const app = createApp({
  template: `
    <div id="main-app" style="display: flex; height: 100vh; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="width: 260px; background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; box-shadow: 2px 0 10px rgba(0,0,0,0.1);">
        <h2 style="margin: 0 0 30px; font-size: 20px; font-weight: 600; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          💼 會計內控系統
        </h2>
        <nav style="display: flex; flex-direction: column; gap: 12px;">
          <router-link 
            to="/" 
            style="color: white; padding: 12px 16px; background: rgba(52, 152, 219, 0.2); text-decoration: none; border-radius: 6px; transition: all 0.3s; display: flex; align-items: center; gap: 10px;"
            active-class="active-link">
            <span style="font-size: 18px;">📊</span>
            <span>儀表板</span>
          </router-link>
          <router-link 
            to="/ocr-batch" 
            style="color: white; padding: 12px 16px; background: rgba(52, 152, 219, 0.2); text-decoration: none; border-radius: 6px; transition: all 0.3s; display: flex; align-items: center; gap: 10px;"
            active-class="active-link">
            <span style="font-size: 18px;">🖼️</span>
            <span>OCR 批量識別</span>
          </router-link>
        </nav>
      </div>
      <div style="flex: 1; padding: 40px; overflow: auto; background: #ecf0f1;">
        <router-view />
      </div>
    </div>
  `
});



// ========== 註冊 Pinia ==========
const pinia = createPinia();
app.use(pinia);

// ========== 註冊 Router ==========
app.use(router);

// ========== 全局錯誤處理 ==========
app.config.errorHandler = (err, instance, info) => {
  console.error('🔴 Vue 錯誤:', err);
  console.error('📍 組件:', instance);
  console.error('ℹ️ 詳情:', info);
};

// ========== 掛載應用 ==========
app.mount('#app');

console.log('✅ 應用已成功掛載（簡化版 - 無外部依賴）');
console.log('🌐 訪問 http://localhost 或直接打開 index.html');
