/**
 * 應用入口文件
 * 初始化 Vue 應用、路由、狀態管理
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import router from './router/index.js';
import MainLayout from './layouts/MainLayout.vue';

// 引入樣式
import './assets/styles/variables.css';
import './assets/styles/main.css';
import './assets/styles/theme.css';
import './assets/styles/utilities.css';

// 創建 Vue 應用實例
const app = createApp({
  template: '<MainLayout><router-view /></MainLayout>',
  components: {
    MainLayout
  }
});

// 註冊 Pinia 狀態管理
const pinia = createPinia();
app.use(pinia);

// 註冊 Vue Router
app.use(router);

// 註冊 PrimeVue
app.use(PrimeVue, {
  ripple: true
});

// 掛載應用
app.mount('#app');

console.log('✅ 應用已啟動');
