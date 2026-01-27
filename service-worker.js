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
  
  // Vue 生態系統
  './public/libs/vue.global.prod.js',
  './public/libs/vue-router.global.prod.js',
  './public/libs/pinia.iife.prod.js',
  
  // PrimeVue 組件庫
  './public/libs/primevue/primevue.min.js',
  './public/libs/primevue/themes/lara-light-blue/theme.css',
  './public/libs/primevue/core/core.min.css',
  './public/libs/primeicons/primeicons.css',
  
  // 核心工具庫
  './public/libs/decimal.min.js',
  './public/libs/dayjs.min.js',
  './public/libs/dayjs-locale-zh-tw.min.js',
  './public/libs/lodash.min.js',
  './public/libs/dompurify.min.js',
  './public/libs/dexie.min.js',
  
  // PDF 生成與處理
  './public/libs/jspdf.umd.min.js',
  './public/libs/pdf-lib.min.js',
  './public/libs/pdfjs/pdf.min.js',
  './public/libs/pdfjs/pdf.worker.min.js',
  
  // 圖表庫
  './public/libs/chart.umd.min.js',
  './public/libs/echarts.min.js',
  
  // 文件處理
  './public/libs/file-saver.min.js',
  './public/libs/jszip.min.js',
  './public/libs/xlsx.full.min.js'
];

// 安裝事件：緩存核心資源（逐個添加，失敗不阻止）
self.addEventListener('install', (event) => {
  console.log('[SW] 安裝中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] 緩存核心資源');
        
        // 逐個添加資源，失敗時記錄但不中斷
        const results = await Promise.allSettled(
          CORE_ASSETS.map(async (url) => {
            try {
              await cache.add(url);
              console.log(`[SW] ✅ 已緩存: ${url}`);
              return { url, success: true };
            } catch (err) {
              console.warn(`[SW] ⚠️ 緩存失敗: ${url}`, err.message);
              return { url, success: false, error: err.message };
            }
          })
        );
        
        const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
        if (failed.length > 0) {
          console.warn(`[SW] ${failed.length} 個資源緩存失敗，但不影響離線功能`);
        }
        
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] 緩存過程出錯:', err);
        // 即使失敗也繼續安裝
        return self.skipWaiting();
      })
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

// 請求攔截：緩存優先策略（靜默失敗）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 安全檢查：確保 URL 有效
  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    console.warn('[SW] 無效的 URL:', request.url);
    return;
  }
  
  // 只處理同源請求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 對於導航請求（頁面載入），使用網絡優先
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 靜默緩存，不阻止響應
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          }).catch(() => {});
          return response;
        })
        .catch(() => {
          // 網絡失敗時嘗試從緩存讀取
          return caches.match(request).then(cached => {
            return cached || new Response('<!DOCTYPE html><html><body><h1>離線模式</h1><p>請檢查網絡連接</p></body></html>', {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }
  
  // 其他資源使用緩存優先（靜默失敗）
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // 只緩存成功的 GET 請求（靜默失敗）
            if (request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone).catch(() => {});
              }).catch(() => {});
            }
            return response;
          })
          .catch(() => {
            // 網絡失敗但無緩存：返回透明響應，不在 console 顯示錯誤
            return new Response(null, { status: 200, statusText: 'OK' });
          });
      })
      .catch(() => {
        // 緩存讀取失敗：返回透明響應
        return new Response(null, { status: 200, statusText: 'OK' });
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
