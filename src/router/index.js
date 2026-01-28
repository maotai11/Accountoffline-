/**
 * Vue Router 配置
 * 管理應用路由與頁面導航
 */

const { createRouter, createWebHashHistory } = VueRouter;

// 動態組件載入器（非同步載入優化）
const lazyLoad = (component) => {
  return () => import(`../modules/${component}`);
};

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../modules/dashboard/Dashboard.vue')
  },
  {
    path: '/calculations',
    name: 'Calculations',
    component: () => import('../modules/calculation/CalculationIndex.vue')
  },
  {
    path: '/withholding',
    name: 'Withholding',
    component: () => import('../modules/calculation/WithholdingCalculator.vue')
  },
  {
    path: '/pit',
    name: 'PIT',
    component: () => import('../modules/calculation/PITCalculator.vue')
  },
  {
    path: '/cit',
    name: 'CIT',
    component: () => import('../modules/calculation/CITCalculator.vue')
  },
  {
    path: '/penalty',
    name: 'Penalty',
    component: () => import('../modules/calculation/PenaltyCalculator.vue')
  },
  {
    path: '/ocr-batch',
    name: 'OCRBatch',
    component: () => import('../components/ocr/BatchOCRProcessor.vue'),
    meta: {
      title: 'OCR 批量識別',
      description: '發票批量OCR識別與驗證'
    }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../modules/reports/ReportGenerator.vue')
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('../modules/rules/RuleManager.vue')
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../modules/history/CalculationHistory.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

// 路由守衛（可擴展權限檢查）
router.beforeEach((to, from, next) => {
  // 更新頁面標題
  document.title = to.meta?.title 
    ? `${to.meta.title} - 會計內控系統` 
    : '會計事務所內控作業系統';
  
  next();
});

export default router;
