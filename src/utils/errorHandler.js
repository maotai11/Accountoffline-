/**
 * 全局錯誤處理器
 * 捕獲並記錄應用中的各類錯誤
 */

/**
 * 初始化全局錯誤處理
 */
export function initializeErrorHandler() {
  // 捕獲未處理的 JavaScript 錯誤
  window.addEventListener('error', (event) => {
    console.error('🔴 全局錯誤:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // 可選：上報到錯誤追蹤服務
    if (window.ErrorTracker) {
      window.ErrorTracker.captureException(event.error, {
        type: 'unhandled_error',
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    }
    
    // 防止默認行為（可選）
    // event.preventDefault();
  });

  // 捕獲未處理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 未處理的 Promise 錯誤:', {
      reason: event.reason,
      promise: event.promise
    });
    
    // 可選：上報到錯誤追蹤服務
    if (window.ErrorTracker) {
      window.ErrorTracker.captureException(event.reason, {
        type: 'unhandled_rejection'
      });
    }
    
    // 防止默認行為（可選）
    // event.preventDefault();
  });

  console.log('✅ 全局錯誤處理已初始化');
}

/**
 * 初始化網絡監控
 */
export function initializeNetworkMonitor() {
  // 監聽在線/離線狀態
  window.addEventListener('online', () => {
    console.log('🌐 網絡已連接');
    
    // 可選：通知用戶
    if (window.Toast) {
      window.Toast.success('網絡已連接');
    }
  });

  window.addEventListener('offline', () => {
    console.warn('📡 網絡已斷開');
    
    // 可選：通知用戶
    if (window.Toast) {
      window.Toast.warning('網絡已斷開，應用將以離線模式運行');
    }
  });

  // 初始狀態檢查
  if (navigator.onLine) {
    console.log('🌐 當前網絡狀態：在線');
  } else {
    console.log('📡 當前網絡狀態：離線');
  }

  console.log('✅ 網絡監控已初始化');
}

/**
 * 手動報告錯誤
 * @param {Error} error - 錯誤對象
 * @param {Object} context - 上下文信息
 */
export function reportError(error, context = {}) {
  console.error('🔴 手動報告錯誤:', error, context);
  
  if (window.ErrorTracker) {
    window.ErrorTracker.captureException(error, context);
  }
}

/**
 * 捕獲並記錄警告
 * @param {string} message - 警告消息
 * @param {Object} context - 上下文信息
 */
export function reportWarning(message, context = {}) {
  console.warn('⚠️ 警告:', message, context);
  
  if (window.ErrorTracker) {
    window.ErrorTracker.captureMessage(message, {
      level: 'warning',
      ...context
    });
  }
}

// 默認導出
export default {
  initializeErrorHandler,
  initializeNetworkMonitor,
  reportError,
  reportWarning
};
