/**
 * Vue Router 配置
 * 定義應用路由規則
 */

import { createRouter, createWebHistory } from 'vue-router';

// 路由頁面組件
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue')
  },
  {
    path: '/case',
    name: 'Case',
    component: () => import('../views/CaseManagementView.vue')
  },
  {
    path: '/record',
    name: 'Record',
    component: () => import('../views/RecordView.vue')
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/ReportView.vue')
  },
  {
    path: '/tax-calc',
    name: 'TaxCalc',
    component: () => import('../views/TaxCalcView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  }
];

// 創建路由實例
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
