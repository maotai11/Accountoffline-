/**
 * 應用入口文件
 * 初始化 Vue 應用、路由、狀態管理
 */

import router from './router/index.js';
import MainLayout from './layouts/MainLayout.vue';

const { createApp } = Vue;
const { createPinia } = Pinia;

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
app.use(PrimeVue.Config, {
  ripple: true,
  locale: {
    startsWith: '開始於',
    contains: '包含',
    notContains: '不包含',
    endsWith: '結束於',
    equals: '等於',
    notEquals: '不等於',
    noFilter: '無過濾',
    filter: '過濾',
    lt: '小於',
    lte: '小於等於',
    gt: '大於',
    gte: '大於等於',
    dateIs: '日期是',
    dateIsNot: '日期不是',
    dateBefore: '日期早於',
    dateAfter: '日期晚於',
    clear: '清除',
    apply: '套用',
    matchAll: '符合全部',
    matchAny: '符合任一',
    addRule: '新增規則',
    removeRule: '移除規則',
    accept: '是',
    reject: '否',
    choose: '選擇',
    upload: '上傳',
    cancel: '取消',
    dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
    dayNamesMin: ['日', '一', '二', '三', '四', '五', '六'],
    monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    today: '今天',
    weekHeader: '週',
    firstDayOfWeek: 0,
    dateFormat: 'yy/mm/dd',
    weak: '弱',
    medium: '中',
    strong: '強',
    passwordPrompt: '輸入密碼'
  }
});

// 全局錯誤處理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue 錯誤:', err);
  console.error('組件:', instance);
  console.error('錯誤資訊:', info);
  
  // 可擴展：上報到錯誤追蹤服務
  if (window.ErrorTracker) {
    window.ErrorTracker.captureException(err, {
      context: info,
      component: instance?.$options?.name
    });
  }
};

// 全局警告處理（開發環境）
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue 警告:', msg);
  console.warn('追蹤:', trace);
};

// 掛載應用
app.mount('#app');

// 開發環境工具
if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
  window.__VUE_APP__ = app;
  window.__VUE_ROUTER__ = router;
  window.__PINIA__ = pinia;
  console.log('🚀 會計內控系統已啟動（開發模式）');
  console.log('📱 Vue Devtools 可用');
}

console.log('✅ 應用初始化完成');
