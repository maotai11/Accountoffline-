/**
 * PDF 解析器
 * 從 PDF 文件中提取法規條文並結構化
 * 使用 PDF.js 進行解析
 */

import Sanitizer from '../utils/sanitizer.js';

export class PDFParser {
  constructor() {
    // PDF.js 從全局載入
    this.pdfjsLib = window['pdfjs-dist/build/pdf'];
    
    if (!this.pdfjsLib) {
      console.warn('[PDFParser] PDF.js 尚未載入');
    } else {
      // 設置 worker
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/public/libs/pdfjs/pdf.worker.min.js';
    }
  }

  /**
   * 解析 PDF 文件
   * @param {File|ArrayBuffer} file - PDF 文件
   * @returns {Promise<Object>} 解析結果
   */
  async parsePDF(file) {
    try {
      // 讀取文件為 ArrayBuffer
      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      
      // 載入 PDF 文檔
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // 提取所有頁面文本
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        pages.push({
          pageNumber: i,
          text: Sanitizer.escapeHTML(pageText)
        });
      }
      
      // 合併所有頁面文本
      const fullText = pages.map(p => p.text).join('\n\n');
      
      return {
        success: true,
        metadata: {
          numPages: pdf.numPages,
          title: file.name || 'Unknown'
        },
        pages,
        fullText,
        extractedRules: await this._extractRules(fullText)
      };
    } catch (error) {
      console.error('[PDFParser] 解析 PDF 失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 從文本中提取規則
   * 使用正則表達式識別法規條文模式
   */
  async _extractRules(text) {
    const rules = [];
    
    try {
      // 清理文本
      const cleanText = text.replace(/\s+/g, ' ').trim();
      
      // 提取規則模式：
      // 1. 條文編號（第X條、第X項、第X款等）
      // 2. 稅率資訊（XX%、百分之XX）
      // 3. 金額資訊（NT$、新臺幣）
      // 4. 日期資訊（民國XXX年、XXXX年XX月XX日）
      
      // 模式 1: 條文結構
      const articlePattern = /第\s*([一二三四五六七八九十百千萬\d]+)\s*條[^第]*?(?=第|$)/g;
      let match;
      
      while ((match = articlePattern.exec(cleanText)) !== null) {
        const articleNumber = match[1];
        const content = match[0];
        
        // 提取條文內容中的關鍵資訊
        const rateMatch = content.match(/([零一二三四五六七八九十百\d.]+)\s*[%％百分之]/);
        const amountMatch = content.match(/(?:NT\$|新臺幣|元)\s*([\d,]+)/);
        
        const rule = {
          type: 'article',
          articleNumber: Sanitizer.escapeHTML(articleNumber),
          content: Sanitizer.escapeHTML(content.substring(0, 500)), // 限制長度防止過長
          rate: rateMatch ? Sanitizer.sanitizeNumber(this._chineseToNumber(rateMatch[1])) : null,
          amount: amountMatch ? Sanitizer.sanitizeNumber(amountMatch[1].replace(/,/g, '')) : null,
          extracted: new Date().toISOString()
        };
        
        rules.push(rule);
      }
      
      // 模式 2: 稅率表格
      const rateTablePattern = /稅率\s*表|稅率\s*級距|累進\s*稅率/gi;
      if (rateTablePattern.test(cleanText)) {
        const tableRules = this._extractRateTable(cleanText);
        rules.push(...tableRules);
      }
      
      // 模式 3: 扣繳率
      const withholdingPattern = /扣繳率\s*[:：]?\s*([零一二三四五六七八九十百\d.]+)\s*[%％]/g;
      while ((match = withholdingPattern.exec(cleanText)) !== null) {
        const rate = Sanitizer.sanitizeNumber(this._chineseToNumber(match[1]));
        rules.push({
          type: 'withholding_rate',
          rate,
          content: Sanitizer.escapeHTML(match[0]),
          extracted: new Date().toISOString()
        });
      }
      
      // 模式 4: 免稅額
      const exemptionPattern = /免稅額\s*[:：]?\s*(?:NT\$|新臺幣)?\s*([\d,]+)/g;
      while ((match = exemptionPattern.exec(cleanText)) !== null) {
        const amount = Sanitizer.sanitizeNumber(match[1].replace(/,/g, ''));
        rules.push({
          type: 'exemption',
          amount,
          content: Sanitizer.escapeHTML(match[0]),
          extracted: new Date().toISOString()
        });
      }
      
      // 模式 5: 扣除額
      const deductionPattern = /(?:標準|特別|薪資|儲蓄投資)?扣除額\s*[:：]?\s*(?:NT\$|新臺幣)?\s*([\d,]+)/g;
      while ((match = deductionPattern.exec(cleanText)) !== null) {
        const amount = Sanitizer.sanitizeNumber(match[1].replace(/,/g, ''));
        rules.push({
          type: 'deduction',
          amount,
          content: Sanitizer.escapeHTML(match[0]),
          extracted: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('[PDFParser] 提取規則失敗:', error);
    }
    
    return rules;
  }

  /**
   * 提取稅率表格
   */
  _extractRateTable(text) {
    const tableRules = [];
    
    try {
      // 尋找稅率級距模式
      // 例如：540,000元以下 5%
      //      540,001元至1,210,000元 12%
      const bracketPattern = /([\d,]+)\s*元?\s*(?:以下|至|~|-)\s*([\d,]+)?\s*元?\s*[:：]?\s*([\d.]+)\s*[%％]/g;
      let match;
      
      while ((match = bracketPattern.exec(text)) !== null) {
        const min = Sanitizer.sanitizeNumber(match[1].replace(/,/g, ''));
        const max = match[2] ? Sanitizer.sanitizeNumber(match[2].replace(/,/g, '')) : Infinity;
        const rate = Sanitizer.sanitizeNumber(match[3]);
        
        tableRules.push({
          type: 'tax_bracket',
          min,
          max,
          rate,
          content: Sanitizer.escapeHTML(match[0]),
          extracted: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[PDFParser] 提取稅率表格失敗:', error);
    }
    
    return tableRules;
  }

  /**
   * 中文數字轉阿拉伯數字
   */
  _chineseToNumber(chineseNum) {
    const chineseMap = {
      '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
      '十': 10, '百': 100, '千': 1000, '萬': 10000
    };
    
    // 如果已經是數字，直接返回
    if (/^\d+\.?\d*$/.test(chineseNum)) {
      return parseFloat(chineseNum);
    }
    
    let result = 0;
    let temp = 0;
    let unit = 1;
    
    for (let i = chineseNum.length - 1; i >= 0; i--) {
      const char = chineseNum[i];
      const num = chineseMap[char];
      
      if (num >= 10) {
        unit = num;
      } else {
        temp += num * unit;
      }
    }
    
    result += temp;
    return result || 0;
  }

  /**
   * 批量解析多個 PDF
   */
  async parseBatch(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.parsePDF(file);
        results.push({
          filename: Sanitizer.sanitizeFilename(file.name),
          ...result
        });
      } catch (error) {
        results.push({
          filename: Sanitizer.sanitizeFilename(file.name),
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 將文件讀取為 ArrayBuffer
   */
  async _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      if (file instanceof ArrayBuffer) {
        resolve(file);
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('讀取文件失敗'));
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 驗證 PDF 文件
   */
  isValidPDF(file) {
    if (!file) return false;
    
    // 檢查文件類型
    if (file.type && file.type !== 'application/pdf') {
      return false;
    }
    
    // 檢查文件名
    const filename = Sanitizer.sanitizeFilename(file.name || '');
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return false;
    }
    
    // 檢查文件大小（限制 50MB）
    if (file.size > 50 * 1024 * 1024) {
      return false;
    }
    
    return true;
  }

  /**
   * 提取 PDF 元數據
   */
  async extractMetadata(file) {
    try {
      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const metadata = await pdf.getMetadata();
      
      return {
        success: true,
        numPages: pdf.numPages,
        info: metadata.info ? {
          title: Sanitizer.escapeHTML(metadata.info.Title || ''),
          author: Sanitizer.escapeHTML(metadata.info.Author || ''),
          subject: Sanitizer.escapeHTML(metadata.info.Subject || ''),
          creator: Sanitizer.escapeHTML(metadata.info.Creator || ''),
          producer: Sanitizer.escapeHTML(metadata.info.Producer || ''),
          creationDate: metadata.info.CreationDate || null,
          modDate: metadata.info.ModDate || null
        } : null
      };
    } catch (error) {
      console.error('[PDFParser] 提取元數據失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 搜尋 PDF 中的關鍵字
   */
  async searchInPDF(file, keyword) {
    try {
      const result = await this.parsePDF(file);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const sanitizedKeyword = Sanitizer.escapeHTML(keyword);
      const matches = [];
      
      result.pages.forEach(page => {
        const index = page.text.indexOf(sanitizedKeyword);
        if (index !== -1) {
          // 提取上下文（前後各 50 字符）
          const start = Math.max(0, index - 50);
          const end = Math.min(page.text.length, index + sanitizedKeyword.length + 50);
          const context = page.text.substring(start, end);
          
          matches.push({
            pageNumber: page.pageNumber,
            context: Sanitizer.escapeHTML(context),
            position: index
          });
        }
      });
      
      return {
        success: true,
        keyword: sanitizedKeyword,
        totalMatches: matches.length,
        matches
      };
    } catch (error) {
      console.error('[PDFParser] 搜尋失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default PDFParser;
