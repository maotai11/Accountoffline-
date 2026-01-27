// 會計事務所內控作業系統 - Service Worker
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `accounting-os-${CACHE_VERSION}`;

// 需要緩存的核心資源
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  
  // 樣式
  './src/assets/styles/variables.css',
  './src/assets/styles/main.css',
  './src/assets/styles/theme.css',
  './src/assets/styles/utilities.css',
  
  // 第三方庫
  './public/libs/decimal.min.js',
  './public/libs/dayjs.min.js',
  './public/libs/dayjs-locale-zh-tw.min.js',
  './public/libs/lodash.min.js',
  './public/libs/dompurify.min.js',
  './public/libs/dexie.min.js',
  './public/libs/pdf.min.js',
  './public/libs/pdf.worker.min.js',
  './public/libs/file-saver.min.js',
  './public/libs/jszip.min.js',
  './public/libs/echarts.min.js',
  './public/libs/vue.global.prod.js',
  './public/libs/vue-router.global.prod.js',
  './public/libs/pinia.iife.prod.js',
  './public/libs/primevue/primevue.min.js',
  './public/libs/primevue/themes/lara-light-blue/theme.css',
  './public/libs/primevue/core/core.min.css',
  './public/libs/primeicons/primeicons.css'
];

// 安裝事件：緩存核心資源
self.addEventListener('install', (event) => {
  console.log('[SW] 安裝中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 緩存核心資源');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] 緩存失敗:', err))
  );
});

// 激活事件：清理舊緩存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 刪除舊緩存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 請求攔截：緩存優先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只處理同源請求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 對於導航請求（頁面載入），使用網絡優先
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // 其他資源使用緩存優先
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // 只緩存成功的 GET 請求
            if (request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
      .catch((err) => {
        console.error('[SW] 請求失敗:', request.url, err);
        // 返回離線頁面或默認響應
        return new Response('離線模式下無法載入資源', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// 消息處理：支持手動緩存更新
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
        .then(() => event.ports[0].postMessage({ success: true }))
        .catch((err) => event.ports[0].postMessage({ success: false, error: err.message }))
    );
  }
});
