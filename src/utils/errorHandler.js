/**
 * 全局錯誤處理器
 * 防止離線環境產生 console 錯誤
 */

/**
 * 初始化全局錯誤處理
 */
export function initializeErrorHandler() {
  // 1. 捕獲未處理的 Promise 錯誤
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的 Promise 錯誤:', event.reason);
    event.preventDefault(); // 防止錯誤在 console 顯示
  });

  // 2. 捕獲全局 JavaScript 錯誤
  window.addEventListener('error', (event) => {
    // 忽略資源載入錯誤（離線環境常見）
    if (event.target !== window) {
      const target = event.target;
      const tagName = target.tagName;
      
      if (tagName === 'SCRIPT' || tagName === 'LINK' || tagName === 'IMG') {
        console.warn(`資源載入失敗 (離線模式): ${target.src || target.href}`);
        event.preventDefault();
        return;
      }
    }

    console.error('全局錯誤:', event.message, event.filename, event.lineno);
  });

  // 3. Vue 錯誤處理（將在 main.js 中配置）
  window.__VUE_ERROR_HANDLER__ = (err, instance, info) => {
    console.error('Vue 錯誤:', err, info);
  };

  console.log('✅ 全局錯誤處理器已啟動');
}

/**
 * 安全執行異步函數（自動捕獲錯誤）
 */
export async function safeAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('異步執行錯誤:', error);
    return fallback;
  }
}

/**
 * 安全執行同步函數
 */
export function safeSync(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.error('同步執行錯誤:', error);
    return fallback;
  }
}

/**
 * 檢查資源是否可用
 */
export async function checkResource(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 安全載入腳本
 */
export function safeLoadScript(src, fallbackSrc = null) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    
    script.onload = () => {
      console.log(`✅ 腳本載入成功: ${src}`);
      resolve(true);
    };

    script.onerror = () => {
      console.warn(`⚠️ 腳本載入失敗: ${src}`);
      
      // 嘗試載入備用來源
      if (fallbackSrc) {
        console.log(`🔄 嘗試備用來源: ${fallbackSrc}`);
        script.src = fallbackSrc;
        script.onerror = () => {
          console.error(`❌ 備用來源也失敗: ${fallbackSrc}`);
          reject(new Error(`無法載入腳本: ${src}`));
        };
      } else {
        reject(new Error(`無法載入腳本: ${src}`));
      }
    };

    script.src = src;
    document.head.appendChild(script);
  });
}

/**
 * 安全載入樣式表
 */
export function safeLoadStyle(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    
    link.onload = () => {
      console.log(`✅ 樣式表載入成功: ${href}`);
      resolve(true);
    };

    link.onerror = () => {
      console.warn(`⚠️ 樣式表載入失敗: ${href}`);
      reject(new Error(`無法載入樣式表: ${href}`));
    };

    link.href = href;
    document.head.appendChild(link);
  });
}

/**
 * IndexedDB 錯誤處理
 */
export function handleDBError(error, operation = '操作') {
  console.error(`IndexedDB ${operation}失敗:`, error);
  
  if (error.name === 'QuotaExceededError') {
    return {
      success: false,
      error: '儲存空間不足，請清理部分資料'
    };
  } else if (error.name === 'VersionError') {
    return {
      success: false,
      error: '數據庫版本衝突，請重新載入頁面'
    };
  } else {
    return {
      success: false,
      error: `${operation}失敗: ${error.message}`
    };
  }
}

/**
 * 網絡狀態檢測
 */
export function initializeNetworkMonitor() {
  // 檢查初始網絡狀態
  const updateOnlineStatus = () => {
    const status = navigator.onLine ? '線上' : '離線';
    console.log(`🌐 網絡狀態: ${status}`);
    
    // 發送自定義事件
    window.dispatchEvent(new CustomEvent('network-status-change', {
      detail: { online: navigator.onLine }
    }));
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // 初始檢測
  updateOnlineStatus();
}

/**
 * Service Worker 錯誤處理
 */
export function handleServiceWorkerError(error) {
  console.error('Service Worker 錯誤:', error);
  
  // 不阻止應用運行
  return {
    success: false,
    error: error.message,
    canContinue: true
  };
}

/**
 * 離線回退策略
 */
export const offlineFallback = {
  /**
   * 無法載入 CDN 資源時的處理
   */
  handleMissingLibrary(libraryName) {
    console.warn(`⚠️ ${libraryName} 庫未載入，使用降級功能`);
    return {
      available: false,
      fallback: true,
      message: `${libraryName} 暫不可用（離線模式）`
    };
  },

  /**
   * API 請求失敗時的處理
   */
  handleAPIError(endpoint, error) {
    console.error(`API 請求失敗: ${endpoint}`, error);
    return {
      success: false,
      offline: true,
      message: '離線模式下無法連接伺服器'
    };
  },

  /**
   * 圖片載入失敗時的佔位符
   */
  getImagePlaceholder() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
  }
};

/**
 * 性能監控（防止內存洩漏）
 */
export function initializePerformanceMonitor() {
  if (window.performance && window.performance.memory) {
    setInterval(() => {
      const memory = window.performance.memory;
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
      
      // 只在超過 80% 時警告
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
        console.warn(`⚠️ 內存使用過高: ${usedMB}MB / ${totalMB}MB`);
      }
    }, 60000); // 每分鐘檢查一次
  }
}

export default {
  initializeErrorHandler,
  initializeNetworkMonitor,
  initializePerformanceMonitor,
  safeAsync,
  safeSync,
  safeLoadScript,
  safeLoadStyle,
  handleDBError,
  handleServiceWorkerError,
  offlineFallback
};
