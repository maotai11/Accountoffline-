/**
 * PDF 生成引擎
 * 支援計算報表與規則手冊生成
 * 使用 jsPDF 進行 PDF 創建
 */

import Sanitizer from '../utils/sanitizer.js';

export class PDFGenerator {
  constructor() {
    // jsPDF 從全局載入
    this.jsPDF = window.jspdf?.jsPDF;
    
    if (!this.jsPDF) {
      console.warn('[PDFGenerator] jsPDF 尚未載入');
    }

    // 中文字體配置（使用內嵌字體）
    this.fontConfig = {
      family: 'NotoSansTC',
      style: 'normal',
      weight: 'normal'
    };
  }

  /**
   * 生成扣繳計算報表
   */
  async generateWithholdingReport(data) {
    try {
      // 輸入消毒
      const sanitized = this._sanitizeReportData(data);
      
      const doc = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPos = 20;

      // 標題
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('扣繳稅額計算報表', 105, yPos, { align: 'center' });
      yPos += 15;

      // 基本資訊
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      const info = [
        ['計算日期', sanitized.calculationDate || new Date().toLocaleDateString('zh-TW')],
        ['所得類別', sanitized.incomeType || '-'],
        ['納稅義務人身份', sanitized.residentStatus || '-'],
        ['所得金額', this._formatCurrency(sanitized.incomeAmount)],
        ['扣繳率', `${sanitized.withholdingRate}%`],
        ['應扣繳稅額', this._formatCurrency(sanitized.taxAmount)]
      ];

      info.forEach(([label, value]) => {
        doc.text(`${label}:`, 20, yPos);
        doc.text(String(value), 80, yPos);
        yPos += 8;
      });

      yPos += 10;

      // 計算明細
      if (sanitized.breakdown && sanitized.breakdown.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('計算明細', 20, yPos);
        yPos += 8;
        
        doc.setFont(undefined, 'normal');
        sanitized.breakdown.forEach(item => {
          const text = `${item.label}: ${item.value}`;
          doc.text(text, 25, yPos);
          yPos += 6;
        });
        yPos += 10;
      }

      // 適用法規
      if (sanitized.legalBasis) {
        doc.setFont(undefined, 'bold');
        doc.text('適用法規', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
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
      this._addFooter(doc, '扣繳計算報表');

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 生成報表失敗:', error);
      throw new Error(`PDF 生成失敗: ${error.message}`);
    }
  }

  /**
   * 生成綜所稅計算報表
   */
  async generatePITReport(data) {
    try {
      const sanitized = this._sanitizeReportData(data);
      
      const doc = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPos = 20;

      // 標題
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('綜合所得稅計算報表', 105, yPos, { align: 'center' });
      yPos += 15;

      // 基本資訊
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      const sections = [
        {
          title: '所得資訊',
          items: [
            ['所得總額', this._formatCurrency(sanitized.grossIncome)],
            ['免稅額', this._formatCurrency(sanitized.exemption)],
            ['標準扣除額', this._formatCurrency(sanitized.standardDeduction)],
            ['特別扣除額', this._formatCurrency(sanitized.specialDeduction)]
          ]
        },
        {
          title: '計算結果',
          items: [
            ['綜合所得淨額', this._formatCurrency(sanitized.netIncome)],
            ['應納稅額', this._formatCurrency(sanitized.taxAmount)],
            ['有效稅率', `${sanitized.effectiveRate}%`]
          ]
        }
      ];

      sections.forEach(section => {
        doc.setFont(undefined, 'bold');
        doc.text(section.title, 20, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        section.items.forEach(([label, value]) => {
          doc.text(`${label}:`, 25, yPos);
          doc.text(String(value), 90, yPos);
          yPos += 7;
        });
        yPos += 5;
      });

      // 稅率級距表
      if (sanitized.taxBrackets && sanitized.taxBrackets.length > 0) {
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('適用稅率級距', 20, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // 表頭
        doc.text('級距範圍', 25, yPos);
        doc.text('稅率', 100, yPos);
        doc.text('累進差額', 140, yPos);
        yPos += 6;

        // 表格內容
        sanitized.taxBrackets.forEach(bracket => {
          doc.text(bracket.range, 25, yPos);
          doc.text(`${bracket.rate}%`, 100, yPos);
          doc.text(this._formatCurrency(bracket.deduction), 140, yPos);
          yPos += 6;
        });
      }

      this._addFooter(doc, '綜所稅計算報表');

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 生成報表失敗:', error);
      throw new Error(`PDF 生成失敗: ${error.message}`);
    }
  }

  /**
   * 生成滯納金計算報表
   */
  async generatePenaltyReport(data) {
    try {
      const sanitized = this._sanitizeReportData(data);
      
      const doc = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPos = 20;

      // 標題
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('滯納金計算報表', 105, yPos, { align: 'center' });
      yPos += 15;

      // 基本資訊
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      const info = [
        ['計算日期', sanitized.calculationDate || new Date().toLocaleDateString('zh-TW')],
        ['計算類型', sanitized.calculationType || '-'],
        ['應納稅額', this._formatCurrency(sanitized.taxAmount)],
        ['繳納期限', sanitized.dueDate || '-'],
        ['實際繳納日', sanitized.paymentDate || '-'],
        ['逾期天數', `${sanitized.overdueDays || 0} 天`]
      ];

      info.forEach(([label, value]) => {
        doc.text(`${label}:`, 20, yPos);
        doc.text(String(value), 80, yPos);
        yPos += 8;
      });

      yPos += 10;

      // 分階段明細
      if (sanitized.stageBreakdown && sanitized.stageBreakdown.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('分階段計算明細', 20, yPos);
        yPos += 8;
        
        doc.setFont(undefined, 'normal');
        sanitized.stageBreakdown.forEach(stage => {
          doc.text(`${stage.stage}:`, 25, yPos);
          doc.text(`天數 ${stage.days} 天, 費率 ${stage.rate}%, 金額 ${this._formatCurrency(stage.amount)}`, 60, yPos);
          yPos += 7;
        });
        yPos += 10;
      }

      // 總計
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('滯納金總額:', 20, yPos);
      doc.text(this._formatCurrency(sanitized.totalPenalty), 80, yPos);
      yPos += 8;
      doc.text('應繳總額:', 20, yPos);
      doc.text(this._formatCurrency(sanitized.totalAmount), 80, yPos);

      this._addFooter(doc, '滯納金計算報表');

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 生成報表失敗:', error);
      throw new Error(`PDF 生成失敗: ${error.message}`);
    }
  }

  /**
   * 生成規則手冊
   */
  async generateRuleManual(rules) {
    try {
      const doc = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPos = 20;

      // 封面
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text('稅務規則手冊', 105, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`生成日期: ${new Date().toLocaleDateString('zh-TW')}`, 105, yPos, { align: 'center' });
      yPos += 10;
      doc.text(`總計 ${rules.length} 條規則`, 105, yPos, { align: 'center' });

      // 新頁開始內容
      doc.addPage();
      yPos = 20;

      // 遍歷規則
      rules.forEach((rule, index) => {
        // 消毒規則數據
        const sanitizedRule = {
          id: Sanitizer.escapeHTML(rule.id || ''),
          category: Sanitizer.escapeHTML(rule.category || ''),
          name: Sanitizer.escapeHTML(rule.name || ''),
          description: Sanitizer.escapeHTML(rule.description || ''),
          effectiveDate: Sanitizer.sanitizeDate(rule.effectiveDate),
          legalBasis: Sanitizer.escapeHTML(rule.legalBasis || '')
        };

        // 檢查是否需要新頁
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // 規則標題
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${sanitizedRule.name}`, 20, yPos);
        yPos += 8;

        // 規則資訊
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`類別: ${sanitizedRule.category}`, 25, yPos);
        yPos += 6;
        doc.text(`生效日期: ${sanitizedRule.effectiveDate.toLocaleDateString('zh-TW')}`, 25, yPos);
        yPos += 6;

        // 規則說明
        if (sanitizedRule.description) {
          doc.text('說明:', 25, yPos);
          yPos += 5;
          const descLines = doc.splitTextToSize(sanitizedRule.description, 165);
          descLines.forEach(line => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, 30, yPos);
            yPos += 5;
          });
        }

        // 法律依據
        if (sanitizedRule.legalBasis) {
          yPos += 3;
          doc.setFont(undefined, 'italic');
          doc.text('法律依據:', 25, yPos);
          yPos += 5;
          const basisLines = doc.splitTextToSize(sanitizedRule.legalBasis, 165);
          basisLines.forEach(line => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, 30, yPos);
            yPos += 5;
          });
          doc.setFont(undefined, 'normal');
        }

        yPos += 10;
      });

      this._addFooter(doc, '稅務規則手冊');

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 生成規則手冊失敗:', error);
      throw new Error(`PDF 生成失敗: ${error.message}`);
    }
  }

  /**
   * 批量生成報表（支援多個計算結果）
   */
  async generateBatchReports(calculations, options = {}) {
    try {
      const doc = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let isFirstPage = true;

      for (const calc of calculations) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // 根據類型生成不同報表
        let yPos = 20;
        
        switch (calc.type) {
          case 'withholding':
            await this._addWithholdingContent(doc, calc.data, yPos);
            break;
          case 'pit':
            await this._addPITContent(doc, calc.data, yPos);
            break;
          case 'penalty':
            await this._addPenaltyContent(doc, calc.data, yPos);
            break;
          default:
            console.warn(`未知的計算類型: ${calc.type}`);
        }
      }

      this._addFooter(doc, options.title || '批量計算報表');

      return doc;
    } catch (error) {
      console.error('[PDFGenerator] 批量生成失敗:', error);
      throw new Error(`批量 PDF 生成失敗: ${error.message}`);
    }
  }

  /**
   * 儲存 PDF 到本地
   */
  async savePDF(doc, filename) {
    try {
      const sanitizedFilename = Sanitizer.sanitizeFilename(filename);
      const finalFilename = sanitizedFilename.endsWith('.pdf') 
        ? sanitizedFilename 
        : `${sanitizedFilename}.pdf`;
      
      doc.save(finalFilename);
      return { success: true, filename: finalFilename };
    } catch (error) {
      console.error('[PDFGenerator] 儲存 PDF 失敗:', error);
      throw new Error(`儲存 PDF 失敗: ${error.message}`);
    }
  }

  /**
   * 獲取 PDF Blob
   */
  async getPDFBlob(doc) {
    try {
      return doc.output('blob');
    } catch (error) {
      console.error('[PDFGenerator] 生成 Blob 失敗:', error);
      throw new Error(`生成 Blob 失敗: ${error.message}`);
    }
  }

  /**
   * 消毒報表數據
   */
  _sanitizeReportData(data) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = Sanitizer.escapeHTML(value);
      } else if (typeof value === 'number') {
        sanitized[key] = Sanitizer.sanitizeNumber(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this._sanitizeReportData(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitizeReportData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * 格式化貨幣
   */
  _formatCurrency(amount) {
    const num = Sanitizer.sanitizeNumber(amount);
    return `NT$ ${num.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  /**
   * 添加頁腳
   */
  _addFooter(doc, reportType) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `${reportType} | 第 ${i} 頁，共 ${pageCount} 頁 | 生成時間: ${new Date().toLocaleString('zh-TW')}`,
        105,
        287,
        { align: 'center' }
      );
    }
  }

  /**
   * 添加扣繳內容到現有 PDF
   */
  async _addWithholdingContent(doc, data, startY) {
    // 實現略（與 generateWithholdingReport 類似，但使用傳入的 doc 和 startY）
  }

  /**
   * 添加綜所稅內容到現有 PDF
   */
  async _addPITContent(doc, data, startY) {
    // 實現略
  }

  /**
   * 添加滯納金內容到現有 PDF
   */
  async _addPenaltyContent(doc, data, startY) {
    // 實現略
  }
}

export default PDFGenerator;
