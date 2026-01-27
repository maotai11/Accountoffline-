#!/usr/bin/env python3
"""
會計事務所內控作業系統 - 第三方庫自動下載腳本
自動下載所有必需的 JavaScript 庫到 public/libs 目錄
"""

import os
import urllib.request
import sys
from pathlib import Path

# 第三方庫 CDN 列表
LIBRARIES = {
    # 核心工具庫
    'decimal.min.js': 'https://cdn.jsdelivr.net/npm/decimal.js@10.4.3/decimal.min.js',
    'dayjs.min.js': 'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js',
    'dayjs-locale-zh-tw.min.js': 'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/zh-tw.js',
    'lodash.min.js': 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
    'dompurify.min.js': 'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js',
    
    # 數據持久化
    'dexie.min.js': 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
    
    # PDF 處理
    'pdf.min.js': 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    'pdf.worker.min.js': 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
    
    # 文件處理
    'file-saver.min.js': 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js',
    'jszip.min.js': 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    
    # 圖表庫
    'echarts.min.js': 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
    
    # Vue 生態系統
    'vue.global.prod.js': 'https://cdn.jsdelivr.net/npm/vue@3.4.15/dist/vue.global.prod.js',
    'vue-router.global.prod.js': 'https://cdn.jsdelivr.net/npm/vue-router@4.2.5/dist/vue-router.global.prod.js',
    'pinia.iife.prod.js': 'https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.iife.prod.js',
    
    # PrimeVue 組件庫
    'primevue/primevue.min.js': 'https://cdn.jsdelivr.net/npm/primevue@3.48.1/umd/primevue.min.js',
    'primevue/core/core.min.css': 'https://cdn.jsdelivr.net/npm/primevue@3.48.1/resources/primevue.min.css',
    'primevue/themes/lara-light-blue/theme.css': 'https://cdn.jsdelivr.net/npm/primevue@3.48.1/resources/themes/lara-light-blue/theme.css',
    'primeicons/primeicons.css': 'https://cdn.jsdelivr.net/npm/primeicons@6.0.1/primeicons.css',
    'primeicons/fonts/primeicons.woff2': 'https://cdn.jsdelivr.net/npm/primeicons@6.0.1/fonts/primeicons.woff2',
    'primeicons/fonts/primeicons.woff': 'https://cdn.jsdelivr.net/npm/primeicons@6.0.1/fonts/primeicons.woff',
    'primeicons/fonts/primeicons.ttf': 'https://cdn.jsdelivr.net/npm/primeicons@6.0.1/fonts/primeicons.ttf',
}

def download_file(url, dest_path):
    """下載單個文件"""
    try:
        print(f"  下載中: {dest_path.name}")
        
        # 確保目錄存在
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 下載文件
        urllib.request.urlretrieve(url, dest_path)
        
        # 檢查文件大小
        file_size = dest_path.stat().st_size
        if file_size > 0:
            print(f"  ✓ 完成: {dest_path.name} ({file_size:,} bytes)")
            return True
        else:
            print(f"  ✗ 失敗: {dest_path.name} (文件為空)")
            return False
            
    except Exception as e:
        print(f"  ✗ 錯誤: {dest_path.name} - {str(e)}")
        return False

def main():
    """主函數"""
    print("=" * 60)
    print("會計事務所內控作業系統 - 第三方庫下載工具")
    print("=" * 60)
    print()
    
    # 獲取腳本所在目錄
    script_dir = Path(__file__).parent
    libs_dir = script_dir / 'public' / 'libs'
    
    print(f"目標目錄: {libs_dir}")
    print(f"總共 {len(LIBRARIES)} 個文件需要下載")
    print()
    
    # 下載統計
    success_count = 0
    failed_count = 0
    
    # 逐個下載
    for i, (relative_path, url) in enumerate(LIBRARIES.items(), 1):
        print(f"[{i}/{len(LIBRARIES)}] {relative_path}")
        dest_path = libs_dir / relative_path
        
        if download_file(url, dest_path):
            success_count += 1
        else:
            failed_count += 1
        print()
    
    # 輸出統計結果
    print("=" * 60)
    print("下載完成！")
    print(f"✓ 成功: {success_count} 個文件")
    if failed_count > 0:
        print(f"✗ 失敗: {failed_count} 個文件")
    print("=" * 60)
    
    # 返回狀態碼
    return 0 if failed_count == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
