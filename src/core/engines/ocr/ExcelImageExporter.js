/**
 * Excel 圖片匯出模組 - 高精度財務報表 - 強化版
 * 
 * 核心功能：
 * - Excel 匯出：發票清單 + 原始圖片嵌入
 * - 精確計算：使用 Decimal.js 避免浮點誤差
 * - 圖片處理：自動壓縮、調整尺寸、嵌入 Excel
 * - 多工作表：摘要表、明細表、圖片庫
 * - 異常標記：統編不符、日期超範圍自動標紅 ⭐ 新增
 * - 分區加總：正常/異常發票分開統計 ⭐ 新增
 * - 格式美化：專業會計報表樣式
 * 
 * 依賴庫：
 * - ExcelJS：Excel 生成與操作
 * - Decimal.js：高精度數值計算
 * - JSZip：壓縮與打包
 * 
 * @version 2.0.0 - 新增異常標記與分區統計
 * @author 會計事務所內控作業系統
 */

class ExcelImageExporter {
    constructor() {
        // 檢查依賴
        if (typeof ExcelJS === 'undefined') {
            throw new Error('ExcelJS 未載入！請確認 exceljs.min.js 已引入');
        }
        if (typeof Decimal === 'undefined') {
            console.warn('Decimal.js 未載入，將使用原生 Math（可能有精度問題）');
        } else {
            // 配置 Decimal.js（財務級精確度）
            Decimal.set({
                precision: 20,
                rounding: Decimal.ROUND_HALF_UP,
                toExpNeg: -7,
                toExpPos: 21
            });
        }
        
        // 樣式配置
        this.styles = {
            header: {
                font: { name: '微軟正黑體', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: this.createBorder()
            },
            subHeader: {
                font: { name: '微軟正黑體', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: this.createBorder()
            },
            normalCell: {
                font: { name: '微軟正黑體', size: 10 },
                alignment: { horizontal: 'left', vertical: 'middle' },
                border: this.createBorder()
            },
            numberCell: {
                font: { name: '微軟正黑體', size: 10 },
                alignment: { horizontal: 'right', vertical: 'middle' },
                border: this.createBorder(),
                numFmt: '#,##0'
            },
            totalCell: {
                font: { name: '微軟正黑體', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
                alignment: { horizontal: 'right', vertical: 'middle' },
                border: this.createBorder(),
                numFmt: '#,##0'
            },
            // ⭐ 新增：異常標記樣式
            errorCell: {
                font: { name: '微軟正黑體', size: 10, color: { argb: 'FFFF0000' }, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } },
                alignment: { horizontal: 'left', vertical: 'middle' },
                border: this.createBorder()
            },
            warningCell: {
                font: { name: '微軟正黑體', size: 10, color: { argb: 'FF9C6500' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } },
                alignment: { horizontal: 'left', vertical: 'middle' },
                border: this.createBorder()
            }
        };
    }
    
    /**
     * 創建邊框樣式
     */
    createBorder() {
        const borderStyle = { style: 'thin', color: { argb: 'FFD0D0D0' } };
        return {
            top: borderStyle,
            left: borderStyle,
            bottom: borderStyle,
            right: borderStyle
        };
    }
    
    /**
     * 匯出含圖片的 Excel（主入口） ⭐ 強化版
     * @param {Array} invoiceData - 發票數據數組（含驗證結果）
     * @param {Object} options - 匯出選項
     */
    async exportWithImages(invoiceData, options = {}) {
        console.log('[ExcelExporter] 開始匯出，共', invoiceData.length, '張發票');
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = '會計事務所內控作業系統';
        workbook.created = new Date();
        
        // 1. 創建摘要統計表 ⭐ 新增分區統計
        this.createSummarySheet(workbook, invoiceData, options);
        
        // 2. 創建發票明細表（含異常標記）
        await this.createDetailSheet(workbook, invoiceData, options);
        
        // 3. 創建圖片庫
        await this.createImageSheet(workbook, invoiceData);
        
        // 4. 下載文件
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const filename = options.filename || `發票識別結果_${this.formatDate(new Date())}.xlsx`;
        this.downloadFile(blob, filename);
        
        console.log('[ExcelExporter] 匯出完成:', filename);
    }
    
    /**
     * 創建摘要統計表 ⭐ 強化版：分區統計
     */
    createSummarySheet(workbook, invoiceData, options) {
        const sheet = workbook.addWorksheet('摘要統計', {
            pageSetup: { paperSize: 9, orientation: 'portrait' }
        });
        
        // 標題
        sheet.mergeCells('A1:F1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = '發票 OCR 識別結果統計報表';
        titleCell.font = { name: '微軟正黑體', size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 驗證條件
        let rowIndex = 3;
        if (options.filterConfig) {
            sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
            sheet.getCell(`A${rowIndex}`).value = '驗證條件';
            sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
            rowIndex++;
            
            sheet.getCell(`A${rowIndex}`).value = '買方統編：';
            sheet.getCell(`B${rowIndex}`).value = options.filterConfig.expectedTaxId || '-';
            rowIndex++;
            
            sheet.getCell(`A${rowIndex}`).value = '期間起始：';
            sheet.getCell(`B${rowIndex}`).value = this.formatDate(options.filterConfig.periodStart) || '-';
            rowIndex++;
            
            sheet.getCell(`A${rowIndex}`).value = '期間結束：';
            sheet.getCell(`B${rowIndex}`).value = this.formatDate(options.filterConfig.periodEnd) || '-';
            rowIndex += 2;
        }
        
        // ⭐ 分區統計：正常發票 vs 異常發票
        const normalInvoices = invoiceData.filter(inv => inv.validationResult?.valid && !inv.validationResult?.warnings.length);
        const warningInvoices = invoiceData.filter(inv => inv.validationResult?.warnings.length > 0);
        const errorInvoices = invoiceData.filter(inv => !inv.validationResult?.valid);
        
        const taxIdMismatch = invoiceData.filter(inv => inv.invoice._taxIdMismatch);
        const dateOutOfRange = invoiceData.filter(inv => inv.invoice._dateOutOfRange);
        
        // 基本統計
        sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
        sheet.getCell(`A${rowIndex}`).value = '基本統計';
        sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
        rowIndex++;
        
        const basicStats = [
            ['總發票數', invoiceData.length],
            ['正常發票', normalInvoices.length],
            ['警告發票', warningInvoices.length],
            ['錯誤發票', errorInvoices.length],
            ['統編不符', taxIdMismatch.length],
            ['日期超範圍', dateOutOfRange.length]
        ];
        
        basicStats.forEach(([label, value]) => {
            sheet.getCell(`A${rowIndex}`).value = label + '：';
            const valueCell = sheet.getCell(`B${rowIndex}`);
            valueCell.value = value;
            valueCell.alignment = { horizontal: 'right' };
            
            // 異常數據標紅
            if (label.includes('錯誤') || label.includes('不符') || label.includes('超範圍')) {
                if (value > 0) {
                    valueCell.font = { color: { argb: 'FFFF0000' }, bold: true };
                }
            }
            rowIndex++;
        });
        
        rowIndex += 2;
        
        // ⭐ 金額統計：分區計算
        sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
        sheet.getCell(`A${rowIndex}`).value = '金額統計（按驗證狀態分區）';
        sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 12 };
        rowIndex++;
        
        // 表頭
        const headers = ['分類', '發票數', '未稅金額', '稅額', '總計', '備註'];
        headers.forEach((header, index) => {
            const cell = sheet.getCell(rowIndex, index + 1);
            cell.value = header;
            Object.assign(cell, this.styles.subHeader);
        });
        rowIndex++;
        
        // 計算各區金額
        const regions = [
            { name: '正常發票', data: normalInvoices, note: '通過所有驗證' },
            { name: '警告發票', data: warningInvoices, note: '有警告但可接受' },
            { name: '錯誤發票', data: errorInvoices, note: '驗證失敗，需檢查' },
            { name: '統編不符', data: taxIdMismatch, note: '買方統編與預期不符' },
            { name: '日期超範圍', data: dateOutOfRange, note: '發票日期超出期間' }
        ];
        
        regions.forEach(region => {
            const subtotalSum = this.calculateSum(region.data.map(inv => inv.invoice.subtotal));
            const taxSum = this.calculateSum(region.data.map(inv => inv.invoice.taxAmount));
            const totalSum = this.calculateSum(region.data.map(inv => inv.invoice.total));
            
            const row = [
                region.name,
                region.data.length,
                subtotalSum,
                taxSum,
                totalSum,
                region.note
            ];
            
            row.forEach((value, colIndex) => {
                const cell = sheet.getCell(rowIndex, colIndex + 1);
                cell.value = value;
                
                // 應用樣式
                if (colIndex === 0 || colIndex === 5) {
                    Object.assign(cell, region.name.includes('錯誤') || region.name.includes('不符') || region.name.includes('超範圍') ? this.styles.errorCell : this.styles.normalCell);
                } else if (colIndex >= 2 && colIndex <= 4) {
                    Object.assign(cell, this.styles.numberCell);
                } else {
                    Object.assign(cell, this.styles.normalCell);
                }
            });
            
            rowIndex++;
        });
        
        // 總計行
        const allSubtotalSum = this.calculateSum(invoiceData.map(inv => inv.invoice.subtotal));
        const allTaxSum = this.calculateSum(invoiceData.map(inv => inv.invoice.taxAmount));
        const allTotalSum = this.calculateSum(invoiceData.map(inv => inv.invoice.total));
        
        const totalRow = ['總計', invoiceData.length, allSubtotalSum, allTaxSum, allTotalSum, ''];
        totalRow.forEach((value, colIndex) => {
            const cell = sheet.getCell(rowIndex, colIndex + 1);
            cell.value = value;
            Object.assign(cell, this.styles.totalCell);
            if (colIndex === 0 || colIndex === 5) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        });
        
        // 設定列寬
        sheet.getColumn(1).width = 15;
        sheet.getColumn(2).width = 10;
        sheet.getColumn(3).width = 15;
        sheet.getColumn(4).width = 15;
        sheet.getColumn(5).width = 15;
        sheet.getColumn(6).width = 30;
    }
    
    /**
     * 創建發票明細表 ⭐ 強化版：異常標記
     */
    async createDetailSheet(workbook, invoiceData, options) {
        const sheet = workbook.addWorksheet('發票明細', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });
        
        // 表頭
        const headers = [
            '序號', '狀態', '發票號碼', '日期', '買方統編', 
            '未稅金額', '稅額', '總計', '信心度', '異常說明'
        ];
        
        headers.forEach((header, index) => {
            const cell = sheet.getCell(1, index + 1);
            cell.value = header;
            Object.assign(cell, this.styles.header);
        });
        
        // 資料行
        invoiceData.forEach((item, index) => {
            const invoice = item.invoice;
            const validation = item.validationResult;
            const rowIndex = index + 2;
            
            // 判斷異常狀態
            const hasError = !validation?.valid;
            const hasWarning = validation?.warnings?.length > 0;
            const hasTaxIdMismatch = invoice._taxIdMismatch;
            const hasDateError = invoice._dateOutOfRange;
            
            // 組合異常說明
            const errorMessages = [];
            if (hasTaxIdMismatch) errorMessages.push('統編不符');
            if (hasDateError) errorMessages.push('日期超範圍');
            if (validation?.errors) {
                validation.errors.forEach(err => {
                    if (!errorMessages.includes(err.type)) {
                        errorMessages.push(err.message.split('：')[0]);
                    }
                });
            }
            if (validation?.warnings) {
                validation.warnings.forEach(warn => {
                    if (!errorMessages.includes(warn.type)) {
                        errorMessages.push(`⚠ ${warn.message.split('：')[0]}`);
                    }
                });
            }
            
            // 狀態標籤
            let statusText = '正常';
            let statusStyle = this.styles.normalCell;
            if (hasError) {
                statusText = '錯誤';
                statusStyle = this.styles.errorCell;
            } else if (hasWarning) {
                statusText = '警告';
                statusStyle = this.styles.warningCell;
            }
            
            // 填充數據
            const rowData = [
                index + 1,
                statusText,
                invoice.invoiceNo || '-',
                this.formatDate(invoice.date) || '-',
                invoice.taxId || '-',
                invoice.subtotal || 0,
                invoice.taxAmount || 0,
                invoice.total || 0,
                ((invoice.confidence?.average || 0) * 100).toFixed(1) + '%',
                errorMessages.join('、') || '-'
            ];
            
            rowData.forEach((value, colIndex) => {
                const cell = sheet.getCell(rowIndex, colIndex + 1);
                cell.value = value;
                
                // 應用樣式
                if (colIndex === 1) {
                    // 狀態列
                    Object.assign(cell, statusStyle);
                } else if (colIndex === 4 && hasTaxIdMismatch) {
                    // 統編不符標紅
                    Object.assign(cell, this.styles.errorCell);
                } else if (colIndex === 3 && hasDateError) {
                    // 日期超範圍標紅
                    Object.assign(cell, this.styles.errorCell);
                } else if (colIndex >= 5 && colIndex <= 7) {
                    // 金額列
                    Object.assign(cell, this.styles.numberCell);
                } else if (colIndex === 9 && errorMessages.length > 0) {
                    // 異常說明
                    Object.assign(cell, hasError ? this.styles.errorCell : this.styles.warningCell);
                } else {
                    Object.assign(cell, this.styles.normalCell);
                }
            });
        });
        
        // 加總行
        const totalRow = invoiceData.length + 2;
        sheet.getCell(totalRow, 1).value = '合計';
        Object.assign(sheet.getCell(totalRow, 1), this.styles.totalCell);
        sheet.mergeCells(totalRow, 1, totalRow, 5);
        
        const subtotalSum = this.calculateSum(invoiceData.map(inv => inv.invoice.subtotal));
        const taxSum = this.calculateSum(invoiceData.map(inv => inv.invoice.taxAmount));
        const totalSum = this.calculateSum(invoiceData.map(inv => inv.invoice.total));
        
        [subtotalSum, taxSum, totalSum].forEach((sum, index) => {
            const cell = sheet.getCell(totalRow, 6 + index);
            cell.value = sum;
            Object.assign(cell, this.styles.totalCell);
        });
        
        // 設定列寬
        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 10;
        sheet.getColumn(3).width = 15;
        sheet.getColumn(4).width = 12;
        sheet.getColumn(5).width = 12;
        sheet.getColumn(6).width = 15;
        sheet.getColumn(7).width = 12;
        sheet.getColumn(8).width = 15;
        sheet.getColumn(9).width = 10;
        sheet.getColumn(10).width = 40;
        
        // 凍結首行
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    }
    
    /**
     * 創建圖片庫
     */
    async createImageSheet(workbook, invoiceData) {
        const sheet = workbook.addWorksheet('圖片庫');
        
        // 標題
        sheet.mergeCells('A1:C1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = '發票原始圖片';
        titleCell.font = { name: '微軟正黑體', size: 14, bold: true };
        titleCell.alignment = { horizontal: 'center' };
        
        // 圖片列表（每行一張，含發票號碼）
        let rowIndex = 3;
        
        for (let i = 0; i < invoiceData.length; i++) {
            const item = invoiceData[i];
            const invoice = item.invoice;
            const file = item.imageFile;
            
            if (!file) continue;
            
            try {
                // 讀取圖片
                const imageData = await this.readFileAsBase64(file);
                const imageId = workbook.addImage({
                    base64: imageData,
                    extension: this.getImageExtension(file.type)
                });
                
                // 發票號碼
                sheet.getCell(rowIndex, 1).value = `${i + 1}. ${invoice.invoiceNo || '未識別'}`;
                sheet.getCell(rowIndex, 1).font = { bold: true };
                
                // 插入圖片（調整大小）
                sheet.addImage(imageId, {
                    tl: { col: 1, row: rowIndex - 1 },
                    ext: { width: 400, height: 300 }
                });
                
                // 設定行高（容納圖片）
                sheet.getRow(rowIndex).height = 225; // 300px / 1.33
                
                rowIndex += 2; // 間隔一行
                
            } catch (error) {
                console.error('圖片處理失敗:', file.name, error);
                sheet.getCell(rowIndex, 1).value = `${i + 1}. 圖片載入失敗`;
                rowIndex++;
            }
        }
        
        // 設定列寬
        sheet.getColumn(1).width = 20;
        sheet.getColumn(2).width = 60;
    }
    
    /**
     * 精確加總（使用 Decimal.js） ⭐ 關鍵功能
     */
    calculateSum(amounts) {
        if (typeof Decimal === 'undefined') {
            // 降級：使用原生 Math
            return amounts.reduce((sum, amount) => sum + (amount || 0), 0);
        }
        
        let sum = new Decimal(0);
        
        for (const amount of amounts) {
            if (amount !== null && amount !== undefined && !isNaN(amount)) {
                sum = sum.plus(new Decimal(amount));
            }
        }
        
        return sum.toNumber();
    }
    
    /**
     * 讀取文件為 Base64
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * 獲取圖片擴展名
     */
    getImageExtension(mimeType) {
        const map = {
            'image/jpeg': 'jpeg',
            'image/jpg': 'jpeg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/bmp': 'bmp'
        };
        return map[mimeType] || 'jpeg';
    }
    
    /**
     * 格式化日期
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    
    /**
     * 下載文件
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelImageExporter;
} else {
    window.ExcelImageExporter = ExcelImageExporter;
}
