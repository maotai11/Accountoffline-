/**
 * PDF 生成引擎（重構版）
 * 支援中文字體 + html2canvas 混合模式
 * 自動處理字體載入與中文渲染
 */

import Sanitizer from '../utils/sanitizer.js';

export class PDFGenerator {
  constructor() {
    this.jsPDF = window.jspdf?.jsPDF;
    this.html2canvas = window.html2canvas;
    this.fontLoaded = false;
    this.fontData = null;
    
    if (!this.jsPDF) {
      console.warn('[PDFGenerator] jsPDF 尚未載入');
    }
    if (!this.html2canvas) {
      console.warn('[PDFGenerator] html2canvas 尚未載入');
    }

    // 中文字體配置
    this.fontConfig = {
      family: 'NotoSansTC',
      regular: './public/libs/fonts/NotoSansTC-Regular.otf',
      bold: './public/libs/fonts/NotoSansTC-Bold.otf'
    };
  }

  /**
   * 載入中文字體（Base64 編碼）
   * 只載入一次並緩存
   */
  async loadChineseFont() {
    if (this.fontLoaded && this.fontData) {
      return this.fontData;
    }

    try {
      console.log('[PDFGenerator] 開始載入中文字體...');
      
      // 載入 Regular 字體
      const regularResponse = await fetch(this.fontConfig.regular);
      if (!regularResponse.ok) {
        throw new Error(`字體載入失敗: ${regularResponse.statusText}`);
      }
      
      const regularBlob = await regularResponse.blob();
      const regularBase64 = await this._blobToBase64(regularBlob);
      
      // 載入 Bold 字體
      const boldResponse = await fetch(this.fontConfig.bold);
      const boldBlob = await boldResponse.blob();
      const boldBase64 = await this._blobToBase64(boldBlob);
      
      this.fontData = {
        regular: regularBase64,
        bold: boldBase64
      };
      
      this.fontLoaded = true;
      console.log('[PDFGenerator] ✓ 中文字體載入完成');
      
      return this.fontData;
    } catch (error) {
      console.error('[PDFGenerator] 字體載入失敗:', error);
      // 返回 null，降級使用 html2canvas
      return null;
    }
  }

  /**
   * Blob 轉 Base64
   */
  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // 移除 data URL 前綴
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 初始化 PDF 文檔並嵌入字體
   */
  async _initPDFWithFont(orientation = 'portrait') {
    const doc = new this.jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    // 嘗試載入字體
    const fontData = await this.loadChineseFont();
    
    if (fontData) {
      try {
        // 添加字體到 jsPDF
        doc.addFileToVFS('NotoSansTC-Regular.otf', fontData.regular);
        doc.addFont('NotoSansTC-Regular.otf', 'NotoSansTC', 'normal');
        
        doc.addFileToVFS('NotoSansTC-Bold.otf', fontData.bold);
        doc.addFont('NotoSansTC-Bold.otf', 'NotoSansTC', 'bold');
        
        // 設為默認字體
        doc.setFont('NotoSansTC', 'normal');
        
        console.log('[PDFGenerator] ✓ 字體已嵌入 PDF');
      } catch (error) {
        console.warn('[PDFGenerator] 字體嵌入失敗，將使用 html2canvas 模式:', error);
        return { doc, useCanvas: true };
      }
    } else {
      return { doc, useCanvas: true };
    }

    return { doc, useCanvas: false };
  }

  /**
   * 生成扣繳計算報表
   */
  async generateWithholdingReport(data) {
    try {
      const sanitized = this._sanitizeReportData(data);
      const { doc, useCanvas } = await this._initPDFWithFont('portrait');

      if (useCanvas) {
        // 使用 html2canvas 模式
        return await this._generateReportByCanvas(sanitized, 'withholding');
      }

      // 使用文字模式（中文字體已載入）
      let yPos = 20;

      // 標題
      doc.setFontSize(18);
      doc.setFont('NotoSansTC', 'bold');
      doc.text('扣繳稅額計算報表', 105, yPos, { align: 'center' });
      yPos += 15;

      // 基本資訊
      doc.setFontSize(12);
      doc.setFont('NotoSansTC', 'normal');
      
      const info = [
        ['計算日期', sanitized.calculationDate || new Date().toLocaleDateString('zh-TW')],
        ['所得類別', sanitized.incomeType || '-'],
        ['納稅義務人身份', sanitized.residentStatus || '-'],
        ['所得金額', this._formatCurrency(sanitized.incomeAmount)],
        ['扣繳率', `${sanitized.withholdingRate}%`],
        ['應扣繳稅額', this._formatCurrency(sanitized.taxAmount)]
      ];

      info.forEach(([label, value]) => {
        doc.setFont('NotoSansTC', 'bold');
        doc.text(`${label}:`, 20, yPos);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(String(value), 80, yPos);
        yPos += 8;
      });

      yPos += 10;

      // 計算明細
      if (sanitized.breakdown && sanitized.breakdown.length > 0) {
        doc.setFont('NotoSansTC', 'bold');
        doc.text('計算明細', 20, yPos);
        yPos += 8;
        
        doc.setFont('NotoSansTC', 'normal');
        sanitized.breakdown.forEach(item => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const text = `${item.label}: ${item.value}`;
          doc.text(text, 25, yPos);
          yPos += 6;
        });
        yPos += 10;
      }

      // 適用法規
      if (sanitized.legalBasis) {
        doc.setFont('NotoSansTC', 'bold');
        doc.text('適用法規', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('NotoSansTC', 'normal');
        const lines = doc.splitTextToSize(sanitized.legalBasis, 170);
        lines.forEach(line => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      }

      // 頁腳
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(`第 ${i} 頁，共 ${pageCount} 頁`, 105, 287, { align: 'center' });
        doc.text(`生成時間: ${new Date().toLocaleString('zh-TW')}`, 20, 287);
      }

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 扣繳報表生成失敗:', error);
      throw error;
    }
  }

  /**
   * 使用 html2canvas 生成報表（降級模式）
   */
  async _generateReportByCanvas(data, reportType) {
    console.log('[PDFGenerator] 使用 html2canvas 模式生成報表');
    
    // 創建臨時 DOM 容器
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 210mm;
      padding: 20mm;
      background: white;
      font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
      font-size: 14px;
      line-height: 1.6;
    `;

    // 構建 HTML 內容
    container.innerHTML = this._buildReportHTML(data, reportType);
    document.body.appendChild(container);

    try {
      // 使用 html2canvas 截圖
      const canvas = await this.html2canvas(container, {
        scale: 2, // 提高清晰度
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 移除臨時容器
      document.body.removeChild(container);

      // 創建 PDF
      const imgWidth = 210; // A4 寬度 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const doc = new this.jsPDF({
        orientation: imgHeight > 297 ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      return doc;
    } catch (error) {
      // 清理臨時容器
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      throw error;
    }
  }

  /**
   * 構建報表 HTML（用於 html2canvas）
   */
  _buildReportHTML(data, reportType) {
    const title = reportType === 'withholding' ? '扣繳稅額計算報表' : 
                  reportType === 'income' ? '綜合所得稅計算報表' : '稅務計算報表';
    
    let html = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0;">${title}</h1>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">計算日期</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.calculationDate || new Date().toLocaleDateString('zh-TW')}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">所得類別</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.incomeType || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">納稅義務人身份</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.residentStatus || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">所得金額</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${this._formatCurrency(data.incomeAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">扣繳率/稅率</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.withholdingRate || data.taxRate}%</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">應納稅額</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d32f2f;">${this._formatCurrency(data.taxAmount)}</td>
        </tr>
      </table>
    `;

    // 計算明細
    if (data.breakdown && data.breakdown.length > 0) {
      html += `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px;">計算明細</h3>
          <ul style="list-style: none; padding-left: 0;">
      `;
      data.breakdown.forEach(item => {
        html += `<li style="padding: 5px 0;">${item.label}: ${item.value}</li>`;
      });
      html += `</ul></div>`;
    }

    // 適用法規
    if (data.legalBasis) {
      html += `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px;">適用法規</h3>
          <p style="white-space: pre-wrap; line-height: 1.8;">${data.legalBasis}</p>
        </div>
      `;
    }

    // 頁腳
    html += `
      <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
        生成時間: ${new Date().toLocaleString('zh-TW')}
      </div>
    `;

    return html;
  }

  /**
   * 生成綜所稅計算報表
   */
  async generateIncomeReport(data) {
    try {
      const sanitized = this._sanitizeReportData(data);
      const { doc, useCanvas } = await this._initPDFWithFont('portrait');

      if (useCanvas) {
        return await this._generateReportByCanvas(sanitized, 'income');
      }

      let yPos = 20;

      // 標題
      doc.setFontSize(18);
      doc.setFont('NotoSansTC', 'bold');
      doc.text('綜合所得稅計算報表', 105, yPos, { align: 'center' });
      yPos += 15;

      // 基本資訊
      doc.setFontSize(12);
      doc.setFont('NotoSansTC', 'normal');
      
      const info = [
        ['計算年度', sanitized.taxYear || new Date().getFullYear()],
        ['申報身份', sanitized.filingStatus || '-'],
        ['綜合所得總額', this._formatCurrency(sanitized.totalIncome)],
        ['免稅額', this._formatCurrency(sanitized.exemption)],
        ['扣除額', this._formatCurrency(sanitized.deduction)],
        ['課稅所得淨額', this._formatCurrency(sanitized.taxableIncome)],
        ['應納稅額', this._formatCurrency(sanitized.taxAmount)]
      ];

      info.forEach(([label, value]) => {
        doc.setFont('NotoSansTC', 'bold');
        doc.text(`${label}:`, 20, yPos);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(String(value), 80, yPos);
        yPos += 8;
      });

      // 級距說明
      if (sanitized.bracketInfo) {
        yPos += 10;
        doc.setFont('NotoSansTC', 'bold');
        doc.text('適用級距', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('NotoSansTC', 'normal');
        const lines = doc.splitTextToSize(sanitized.bracketInfo, 170);
        lines.forEach(line => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      }

      // 頁腳
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(`第 ${i} 頁，共 ${pageCount} 頁`, 105, 287, { align: 'center' });
        doc.text(`生成時間: ${new Date().toLocaleString('zh-TW')}`, 20, 287);
      }

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 綜所稅報表生成失敗:', error);
      throw error;
    }
  }

  /**
   * 批量生成並合併 PDF
   */
  async generateBatchReports(dataArray, options = {}) {
    const { mergeMode = 'individual', filenamePattern = 'report_{index}' } = options;

    try {
      if (mergeMode === 'merge') {
        // 合併模式：所有報表合併成一個 PDF
        const { doc } = await this._initPDFWithFont('portrait');
        
        for (let i = 0; i < dataArray.length; i++) {
          const data = dataArray[i];
          const reportDoc = await this.generateWithholdingReport(data);
          
          if (i > 0) {
            // 添加分頁
            const pages = reportDoc.internal.getNumberOfPages();
            for (let p = 1; p <= pages; p++) {
              doc.addPage();
              // 複製頁面內容（需要更複雜的邏輯，這裡簡化）
            }
          }
        }

        return [{ doc, filename: 'merged_report.pdf' }];
      } else {
        // 個別模式：每個報表獨立 PDF
        const results = [];
        
        for (let i = 0; i < dataArray.length; i++) {
          const data = dataArray[i];
          const doc = await this.generateWithholdingReport(data);
          const filename = filenamePattern.replace('{index}', i + 1).replace('{type}', data.incomeType || 'report');
          
          results.push({ doc, filename: `${filename}.pdf` });
        }

        return results;
      }
    } catch (error) {
      console.error('[PDFGenerator] 批量生成失敗:', error);
      throw error;
    }
  }

  /**
   * 生成規則手冊 PDF
   */
  async generateRuleManual(rules) {
    try {
      const sanitized = rules.map(rule => this._sanitizeRuleData(rule));
      const { doc, useCanvas } = await this._initPDFWithFont('portrait');

      if (useCanvas) {
        console.warn('[PDFGenerator] 規則手冊建議使用字體模式，當前使用 Canvas 模式可能效果不佳');
      }

      let yPos = 20;

      // 封面
      doc.setFontSize(24);
      doc.setFont('NotoSansTC', 'bold');
      doc.text('稅務規則手冊', 105, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('NotoSansTC', 'normal');
      doc.text(`共 ${sanitized.length} 條規則`, 105, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`生成日期: ${new Date().toLocaleDateString('zh-TW')}`, 105, yPos, { align: 'center' });

      // 新頁開始目錄
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(16);
      doc.setFont('NotoSansTC', 'bold');
      doc.text('目錄', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('NotoSansTC', 'normal');
      sanitized.forEach((rule, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${index + 1}. ${rule.title || rule.category}`, 25, yPos);
        yPos += 7;
      });

      // 詳細內容
      sanitized.forEach((rule, index) => {
        doc.addPage();
        yPos = 20;

        // 規則標題
        doc.setFontSize(14);
        doc.setFont('NotoSansTC', 'bold');
        doc.text(`${index + 1}. ${rule.title || rule.category}`, 20, yPos);
        yPos += 10;

        // 規則類別
        doc.setFontSize(11);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(`類別: ${rule.category}`, 20, yPos);
        yPos += 7;
        doc.text(`版本: ${rule.version || '1.0'}`, 20, yPos);
        yPos += 10;

        // 規則描述
        if (rule.description) {
          doc.setFont('NotoSansTC', 'bold');
          doc.text('規則說明:', 20, yPos);
          yPos += 7;
          
          doc.setFont('NotoSansTC', 'normal');
          const descLines = doc.splitTextToSize(rule.description, 170);
          descLines.forEach(line => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, 20, yPos);
            yPos += 6;
          });
          yPos += 5;
        }

        // 法規依據
        if (rule.legalBasis) {
          doc.setFont('NotoSansTC', 'bold');
          doc.text('法規依據:', 20, yPos);
          yPos += 7;
          
          doc.setFontSize(10);
          doc.setFont('NotoSansTC', 'normal');
          const legalLines = doc.splitTextToSize(rule.legalBasis, 170);
          legalLines.forEach(line => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, 20, yPos);
            yPos += 5;
          });
        }
      });

      // 頁腳
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('NotoSansTC', 'normal');
        doc.text(`第 ${i} 頁，共 ${pageCount} 頁`, 105, 287, { align: 'center' });
      }

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 規則手冊生成失敗:', error);
      throw error;
    }
  }

  /**
   * 輸入數據消毒
   */
  _sanitizeReportData(data) {
    return {
      calculationDate: Sanitizer.sanitizeText(data.calculationDate),
      incomeType: Sanitizer.sanitizeText(data.incomeType),
      residentStatus: Sanitizer.sanitizeText(data.residentStatus),
      incomeAmount: Sanitizer.sanitizeNumber(data.incomeAmount),
      withholdingRate: Sanitizer.sanitizeNumber(data.withholdingRate),
      taxRate: Sanitizer.sanitizeNumber(data.taxRate),
      taxAmount: Sanitizer.sanitizeNumber(data.taxAmount),
      breakdown: data.breakdown?.map(item => ({
        label: Sanitizer.sanitizeText(item.label),
        value: Sanitizer.sanitizeText(item.value)
      })),
      legalBasis: Sanitizer.sanitizeText(data.legalBasis),
      taxYear: Sanitizer.sanitizeText(data.taxYear),
      filingStatus: Sanitizer.sanitizeText(data.filingStatus),
      totalIncome: Sanitizer.sanitizeNumber(data.totalIncome),
      exemption: Sanitizer.sanitizeNumber(data.exemption),
      deduction: Sanitizer.sanitizeNumber(data.deduction),
      taxableIncome: Sanitizer.sanitizeNumber(data.taxableIncome),
      bracketInfo: Sanitizer.sanitizeText(data.bracketInfo)
    };
  }

  _sanitizeRuleData(rule) {
    return {
      title: Sanitizer.sanitizeText(rule.title),
      category: Sanitizer.sanitizeText(rule.category),
      version: Sanitizer.sanitizeText(rule.version),
      description: Sanitizer.sanitizeText(rule.description),
      legalBasis: Sanitizer.sanitizeText(rule.legalBasis)
    };
  }

  /**
   * 格式化貨幣
   */
  _formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'NT$ 0';
    }
    return `NT$ ${Number(amount).toLocaleString('zh-TW')}`;
  }
}

export default PDFGenerator;
